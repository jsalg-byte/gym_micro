"use client";

import { useEffect, useMemo, useState } from "react";

const PRESET_SECONDS = [60, 90, 120];

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function RestTimer() {
  const [durationSec, setDurationSec] = useState<number>(90);
  const [remainingSec, setRemainingSec] = useState<number>(90);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [running]);

  const done = remainingSec === 0;
  const clock = useMemo(() => formatClock(remainingSec), [remainingSec]);

  function applyPreset(seconds: number) {
    setDurationSec(seconds);
    setRemainingSec(seconds);
    setRunning(false);
  }

  function resetTimer() {
    setRemainingSec(durationSec);
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
            setRunning(false);
          }}
          className="mt-1 w-full rounded-md border border-cyan-300 px-2 py-1 text-sm outline-none focus:border-cyan-500"
        />
      </label>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((prev) => !prev)}
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
