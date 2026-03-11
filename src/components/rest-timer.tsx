"use client";

import { useEffect, useMemo, useState } from "react";

const PRESET_SECONDS = [60, 90, 120];
const STORAGE_PREFIX = "gym-micro:rest-timer";

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type RestTimerProps = {
  storageKey?: string;
};

type StoredTimer = {
  durationSec: number;
  remainingSec: number;
  endAtMs: number | null;
  running: boolean;
};

export function RestTimer({ storageKey = "default" }: RestTimerProps) {
  const fullStorageKey = `${STORAGE_PREFIX}:${storageKey}`;
  const [durationSec, setDurationSec] = useState<number>(90);
  const [remainingSec, setRemainingSec] = useState<number>(90);
  const [endAtMs, setEndAtMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(fullStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredTimer;
      if (
        !Number.isFinite(parsed.durationSec) ||
        !Number.isFinite(parsed.remainingSec) ||
        typeof parsed.running !== "boolean"
      ) {
        return;
      }

      setDurationSec(Math.max(10, Math.min(600, Math.round(parsed.durationSec))));
      if (parsed.running && parsed.endAtMs && Number.isFinite(parsed.endAtMs)) {
        const nextRemaining = Math.max(0, Math.ceil((parsed.endAtMs - Date.now()) / 1000));
        setRemainingSec(nextRemaining);
        setRunning(nextRemaining > 0);
        setEndAtMs(nextRemaining > 0 ? parsed.endAtMs : null);
      } else {
        setRemainingSec(Math.max(0, Math.round(parsed.remainingSec)));
        setRunning(false);
        setEndAtMs(null);
      }
    } catch {
      // Ignore corrupt local storage values.
    }
  }, [fullStorageKey]);

  useEffect(() => {
    const payload: StoredTimer = {
      durationSec,
      remainingSec,
      endAtMs,
      running,
    };
    window.localStorage.setItem(fullStorageKey, JSON.stringify(payload));
  }, [durationSec, remainingSec, endAtMs, running, fullStorageKey]);

  useEffect(() => {
    if (!running || !endAtMs) {
      return;
    }

    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
      setRemainingSec(next);
      if (next <= 0) {
        setRunning(false);
        setEndAtMs(null);
      }
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [running, endAtMs]);

  const done = remainingSec === 0;
  const clock = useMemo(() => formatClock(remainingSec), [remainingSec]);

  function applyPreset(seconds: number) {
    setDurationSec(seconds);
    setRemainingSec(seconds);
    setEndAtMs(null);
    setRunning(false);
  }

  function resetTimer() {
    setRemainingSec(durationSec);
    setEndAtMs(null);
    setRunning(false);
  }

  function toggleTimer() {
    if (!running) {
      if (remainingSec <= 0) {
        const restartAt = Date.now() + durationSec * 1000;
        setRemainingSec(durationSec);
        setEndAtMs(restartAt);
        setRunning(true);
        return;
      }

      setEndAtMs(Date.now() + remainingSec * 1000);
      setRunning(true);
      return;
    }

    const nextRemaining = endAtMs ? Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000)) : remainingSec;
    setRemainingSec(nextRemaining);
    setEndAtMs(null);
    setRunning(false);
  }

  return (
    <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-cyan-800">Rest Timer</p>
      <p className="mt-1 text-3xl font-black tabular-nums text-cyan-900">{clock}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {PRESET_SECONDS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => applyPreset(seconds)}
            className="rounded-md border border-cyan-300 bg-white px-2 py-1 text-xs font-semibold text-cyan-900 hover:bg-cyan-100"
          >
            {Math.round(seconds / 60)} min
          </button>
        ))}
      </div>

      <label className="mt-2 block text-xs text-cyan-900">
        Custom seconds
        <input
          type="number"
          min={10}
          max={600}
          step={5}
          value={durationSec}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value) || value <= 0) {
              return;
            }
            setDurationSec(value);
            setRemainingSec(value);
            setEndAtMs(null);
            setRunning(false);
          }}
          className="mt-1 w-full rounded-md border border-cyan-300 px-2 py-1 text-sm outline-none focus:border-cyan-500"
        />
      </label>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={toggleTimer}
          className="rounded-md bg-cyan-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-800"
        >
          {running ? "Pause" : done ? "Start Again" : "Start"}
        </button>
        <button
          type="button"
          onClick={resetTimer}
          className="rounded-md border border-cyan-300 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-900 hover:bg-cyan-100"
        >
          Reset
        </button>
      </div>

      {done ? <p className="mt-2 text-xs font-semibold text-emerald-700">Rest complete. Ready for next set.</p> : null}
    </section>
  );
}
