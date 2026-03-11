"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FastingEntry = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  note: string | null;
};

type ActiveFast = {
  id: string;
  startedAt: string;
  note: string | null;
} | null;

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDurationFromMinutes(durationMinutes: number) {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayKeyToDate(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function FastingTracker({
  entries,
  initialActiveFast,
}: {
  entries: FastingEntry[];
  initialActiveFast: ActiveFast;
}) {
  const router = useRouter();
  const [activeFastStartedAt, setActiveFastStartedAt] = useState<string | null>(
    initialActiveFast?.startedAt ?? null,
  );
  const [nowMs, setNowMs] = useState(Date.now());
  const [note, setNote] = useState(initialActiveFast?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [month, setMonth] = useState(startOfMonth(new Date(entries[0]?.endedAt ?? new Date().toISOString())));

  useEffect(() => {
    setActiveFastStartedAt(initialActiveFast?.startedAt ?? null);
    setNote(initialActiveFast?.note ?? "");
  }, [initialActiveFast]);

  useEffect(() => {
    if (!activeFastStartedAt) {
      return;
    }
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeFastStartedAt]);

  const activeElapsedMs = useMemo(() => {
    if (!activeFastStartedAt) {
      return 0;
    }
    return nowMs - new Date(activeFastStartedAt).getTime();
  }, [activeFastStartedAt, nowMs]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, FastingEntry[]>();
    for (const entry of entries) {
      const key = formatDayKey(new Date(entry.endedAt));
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const monthStart = startOfMonth(month);
  const startGrid = new Date(monthStart);
  startGrid.setDate(monthStart.getDate() - monthStart.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startGrid);
    date.setDate(startGrid.getDate() + index);
    const key = formatDayKey(date);
    const dayEntries = groupedByDay.get(key) ?? [];
    const totalMinutes = dayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);

    return {
      key,
      date,
      isInCurrentMonth: date.getMonth() === monthStart.getMonth(),
      entries: dayEntries,
      totalMinutes,
    };
  });

  const selectedEntries = selectedDayKey ? groupedByDay.get(selectedDayKey) ?? [] : [];
  const selectedDate = selectedDayKey ? dayKeyToDate(selectedDayKey) : null;

  async function startFast() {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/fasting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "start",
          note: note.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            active?: {
              startedAt: string;
              note: string | null;
            };
          }
        | null;

      if (!response.ok || !payload?.active) {
        throw new Error(payload?.error ?? "Could not start fast.");
      }

      setActiveFastStartedAt(payload.active.startedAt);
      setNote(payload.active.note ?? "");
      setStatus("Fast started.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start fast.");
    } finally {
      setSaving(false);
    }
  }

  async function endFast() {
    if (!activeFastStartedAt) {
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/fasting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "end",
          note: note.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not save fasting log.");
      }

      setActiveFastStartedAt(null);
      setNote("");
      setStatus("Fast saved.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save fasting log.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4">
        <article className="panel p-4">
          <h1 className="text-xl font-black text-slate-900">Fasting Timer</h1>
          <p className="mt-1 text-sm text-slate-600">
            Start your fast, then end it when done to save to your fasting calendar.
          </p>
        </article>

        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Current Fast</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-slate-900">{formatClock(activeElapsedMs)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {activeFastStartedAt
              ? `Started ${new Date(activeFastStartedAt).toLocaleString()}`
              : "No active fast running."}
          </p>

          <label className="mt-3 block text-sm text-slate-700">
            Note (optional)
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <div className="mt-3 flex gap-2">
            {!activeFastStartedAt ? (
              <button
                type="button"
                onClick={startFast}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Starting..." : "Start Fast"}
              </button>
            ) : (
              <button
                type="button"
                onClick={endFast}
                disabled={saving}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {saving ? "Saving..." : "End + Save Fast"}
              </button>
            )}
          </div>

          {status ? <p className="mt-2 text-sm text-slate-600">{status}</p> : null}
        </article>
      </section>

      <section className="panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-black text-slate-900">Fasting Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth((prev) => addMonths(prev, -1))}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Prev
            </button>
            <p className="text-sm font-semibold text-slate-800">
              {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setMonth((prev) => addMonths(prev, 1))}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((label) => (
            <p key={label} className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
          ))}
          {days.map((day) => (
            <div
              key={day.key}
              className={`min-h-[84px] rounded-lg border p-2 ${
                day.isInCurrentMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
              }`}
            >
              <p className={`text-xs font-semibold ${day.isInCurrentMonth ? "text-slate-800" : "text-slate-400"}`}>
                {day.date.getDate()}
              </p>
              {day.entries.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  className="mt-2 rounded-md bg-amber-100 px-2 py-1 text-left text-[11px] font-semibold text-amber-900 hover:bg-amber-200"
                >
                  {formatDurationFromMinutes(day.totalMinutes)}
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {entries.length === 0 ? <p className="mt-3 text-sm text-slate-500">No fasting logs yet.</p> : null}
      </section>

      {selectedDayKey && selectedDate ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{formatDayLabel(selectedDate)}</h3>
                <p className="text-xs text-slate-600">{selectedEntries.length} fast log(s)</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {selectedEntries.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{formatDurationFromMinutes(entry.durationMinutes)}</p>
                  <p className="text-xs text-slate-600">
                    {new Date(entry.startedAt).toLocaleTimeString()} - {new Date(entry.endedAt).toLocaleTimeString()}
                  </p>
                  {entry.note ? <p className="mt-1 text-xs text-slate-700">{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
