"use client";

import { useEffect, useMemo, useState } from "react";

const PRESET_SECONDS = [60, 120, 300];
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
  const [isOpen, setIsOpen] = useState(false);

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
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-slate-700 dark:border-slate-400 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Rest Timer {clock}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Rest Timer</p>
                <p className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">{clock}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200 dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {PRESET_SECONDS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => applyPreset(seconds)}
                  className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-200 dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                  {Math.round(seconds / 60)} min
                </button>
              ))}
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer list-none text-xs font-semibold text-slate-700 underline underline-offset-2 dark:text-slate-200">
                Custom seconds
              </summary>
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
                className="mt-1 w-full rounded-md border border-slate-400 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-600 dark:border-slate-500 dark:bg-slate-950 dark:text-white dark:focus:border-slate-300"
              />
            </details>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={toggleTimer}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {running ? "Pause" : done ? "Start Again" : "Start"}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-200 dark:border-slate-500 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                Reset
              </button>
            </div>

            {done ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Rest complete. Ready for next set.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
