"use client";

import { useEffect, useMemo, useState } from "react";

type PhotoEntry = {
  id: string;
  capturedAt: string;
  note: string | null;
  objectKey: string;
  imageUrl: string;
};

type SessionEntry = {
  id: string;
  startedAt: string;
  status: string;
  routineName: string | null;
  dayName: string | null;
  setCount: number;
};

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

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProgressCalendar({
  entries,
  sessionEntries,
}: {
  entries: PhotoEntry[];
  sessionEntries: SessionEntry[];
}) {
  const latestDate = entries[0]?.capturedAt ?? sessionEntries[0]?.startedAt ?? new Date().toISOString();
  const initialMonth = startOfMonth(new Date(latestDate));
  const [month, setMonth] = useState(initialMonth);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const photosByDay = useMemo(() => {
    const map = new Map<string, PhotoEntry[]>();
    for (const entry of entries) {
      const key = formatDayKey(new Date(entry.capturedAt));
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionEntry[]>();
    for (const entry of sessionEntries) {
      const key = formatDayKey(new Date(entry.startedAt));
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [sessionEntries]);

  const monthStart = startOfMonth(month);
  const startGrid = new Date(monthStart);
  startGrid.setDate(monthStart.getDate() - monthStart.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startGrid);
    date.setDate(startGrid.getDate() + index);
    const key = formatDayKey(date);
    const dayPhotos = photosByDay.get(key) ?? [];
    const daySessions = sessionsByDay.get(key) ?? [];

    return {
      key,
      date,
      isInCurrentMonth: date.getMonth() === monthStart.getMonth(),
      photos: dayPhotos,
      sessions: daySessions,
    };
  });

  const selectedPhotos = selectedDayKey ? photosByDay.get(selectedDayKey) ?? [] : [];
  const selectedSessions = selectedDayKey ? sessionsByDay.get(selectedDayKey) ?? [] : [];
  const selectedDate = selectedDayKey ? dayKeyToDate(selectedDayKey) : null;
  const activePhoto = selectedPhotos[selectedPhotoIndex] ?? null;

  useEffect(() => {
    setSelectedPhotoIndex(0);
  }, [selectedDayKey]);

  function goToNextPhoto() {
    if (selectedPhotos.length <= 1) {
      return;
    }
    setSelectedPhotoIndex((prev) => (prev + 1) % selectedPhotos.length);
  }

  function goToPrevPhoto() {
    if (selectedPhotos.length <= 1) {
      return;
    }
    setSelectedPhotoIndex((prev) => (prev - 1 + selectedPhotos.length) % selectedPhotos.length);
  }

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-black text-slate-900">Progress Calendar</h1>
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
            <div className="mt-2 space-y-1">
              {day.photos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  className="block rounded-md bg-emerald-100 px-2 py-1 text-left text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200"
                >
                  {day.photos.length} photo{day.photos.length > 1 ? "s" : ""}
                </button>
              ) : null}
              {day.sessions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  className="block rounded-md bg-cyan-100 px-2 py-1 text-left text-[11px] font-semibold text-cyan-900 hover:bg-cyan-200"
                >
                  {day.sessions.length} session{day.sessions.length > 1 ? "s" : ""}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && sessionEntries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No progress photos or workout sessions yet.</p>
      ) : null}

      {selectedDayKey && selectedDate ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">{formatDayLabel(selectedDate)}</h2>
                <p className="text-xs text-slate-600">
                  {selectedPhotos.length} photo{selectedPhotos.length === 1 ? "" : "s"} · {selectedSessions.length} session
                  {selectedSessions.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-black text-slate-900">Progress Photos</h3>
                {activePhoto ? (
                  <div className="mt-2 space-y-2">
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activePhoto.imageUrl}
                        alt={`Progress upload ${activePhoto.id}`}
                        className="mx-auto max-h-[65vh] w-auto object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-600">
                        {new Date(activePhoto.capturedAt).toLocaleTimeString()} · {activePhoto.note || "No note."}
                      </p>
                      {selectedPhotos.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={goToPrevPhoto}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Prev Photo
                          </button>
                          <p className="text-xs text-slate-600">
                            {selectedPhotoIndex + 1} / {selectedPhotos.length}
                          </p>
                          <button
                            type="button"
                            onClick={goToNextPhoto}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Next Photo
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {selectedPhotos.length > 1 ? (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {selectedPhotos.map((entry, index) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => setSelectedPhotoIndex(index)}
                            className={`overflow-hidden rounded border ${
                              index === selectedPhotoIndex ? "border-cyan-500" : "border-slate-200"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={entry.imageUrl} alt={`Progress thumbnail ${entry.id}`} className="h-16 w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No photos uploaded on this day.</p>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-black text-slate-900">Workout Sessions</h3>
                {selectedSessions.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No sessions logged on this day.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selectedSessions.map((session) => (
                      <li key={session.id} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
                        <p className="font-semibold text-slate-900">
                          {session.routineName ?? "Workout Plan"} / {session.dayName ?? "Day"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {new Date(session.startedAt).toLocaleTimeString()} · {session.status} · {session.setCount} set
                          {session.setCount === 1 ? "" : "s"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
