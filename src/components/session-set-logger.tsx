"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addWorkoutSetAction,
  createExerciseForSessionAction,
  setExerciseGifOverrideAction,
} from "@/server/actions";
import type { ExerciseGifCandidate } from "@/lib/exercise-gifs";
import { weightUnitLabel, type WeightUnit } from "@/lib/weight-unit";

type ExerciseOption = {
  id: string;
  name: string;
  gifUrl: string;
  gifCandidates: ExerciseGifCandidate[];
  prefillReps: number | null;
  prefillWeight: string | null;
};

type SessionSetLoggerProps = {
  sessionId: string;
  weightUnit: WeightUnit;
  exerciseOptions: ExerciseOption[];
  initialExerciseId: string;
};

const ACTIVE_EXERCISE_STORAGE_PREFIX = "gym-micro:session-active-exercise";
const ACTIVE_EXERCISE_EVENT = "gym-micro:session-active-exercise-change";

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|m3u8)(\?.*)?$/i.test(url);
}

export function SessionSetLogger({
  sessionId,
  weightUnit,
  exerciseOptions,
  initialExerciseId,
}: SessionSetLoggerProps) {
  const activeExerciseStorageKey = `${ACTIVE_EXERCISE_STORAGE_PREFIX}:${sessionId}`;
  const [selectedExerciseId, setSelectedExerciseId] = useState(initialExerciseId);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [isDemoHidden, setIsDemoHidden] = useState(false);
  const [forceImageFallback, setForceImageFallback] = useState(false);
  const [isMediaUnavailable, setIsMediaUnavailable] = useState(false);
  const [showGifFixModal, setShowGifFixModal] = useState(false);

  const selectedExercise = useMemo(
    () => exerciseOptions.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exerciseOptions, selectedExerciseId],
  );

  useEffect(() => {
    const options = new Set(exerciseOptions.map((exercise) => exercise.id));
    if (options.size === 0) {
      setSelectedExerciseId("");
      return;
    }

    if (selectedExerciseId && options.has(selectedExerciseId)) {
      return;
    }

    const stored = window.localStorage.getItem(activeExerciseStorageKey);
    if (stored && options.has(stored)) {
      setSelectedExerciseId(stored);
      return;
    }

    if (initialExerciseId && options.has(initialExerciseId)) {
      setSelectedExerciseId(initialExerciseId);
      return;
    }

    setSelectedExerciseId(exerciseOptions[0]?.id ?? "");
  }, [exerciseOptions, selectedExerciseId, activeExerciseStorageKey, initialExerciseId]);

  useEffect(() => {
    if (!selectedExercise) {
      setReps("");
      setWeight("");
      setIsDemoHidden(false);
      setForceImageFallback(false);
      setIsMediaUnavailable(false);
      setShowGifFixModal(false);
      return;
    }

    setReps(selectedExercise.prefillReps ? String(selectedExercise.prefillReps) : "");
    setWeight(selectedExercise.prefillWeight ?? "");
    setForceImageFallback(false);
    setIsMediaUnavailable(false);
    setShowGifFixModal(false);
  }, [selectedExercise]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }
    window.localStorage.setItem(activeExerciseStorageKey, selectedExerciseId);
    window.dispatchEvent(
      new CustomEvent(ACTIVE_EXERCISE_EVENT, {
        detail: {
          sessionId,
          exerciseId: selectedExerciseId,
        },
      }),
    );
  }, [selectedExerciseId, sessionId, activeExerciseStorageKey]);

  return (
    <div className="space-y-3">
      <form action={addWorkoutSetAction} className="space-y-3">
        <input type="hidden" name="sessionId" value={sessionId} />
        <label className="block text-sm text-slate-700">
          Exercise
          <select
            name="exerciseId"
            required
            value={selectedExerciseId}
            onChange={(event) => setSelectedExerciseId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            {exerciseOptions.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </label>

        {selectedExercise ? (
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900">Exercise Demo</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGifFixModal(true)}
                  className="text-[11px] font-semibold text-cyan-900 underline underline-offset-2 hover:text-cyan-700"
                >
                  Wrong demo?
                </button>
                <button
                  type="button"
                  onClick={() => setIsDemoHidden((current) => !current)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-cyan-400 bg-cyan-100 text-base font-black leading-none text-cyan-900 hover:bg-cyan-200"
                  aria-label={isDemoHidden ? "Show demo" : "Hide demo"}
                >
                  {isDemoHidden ? "+" : "−"}
                </button>
              </div>
            </div>
            {isDemoHidden ? null : isMediaUnavailable ? (
              <p className="mt-2 rounded-md border border-cyan-200 bg-white p-2 text-xs text-slate-600">
                Demo unavailable for this exercise right now.
              </p>
            ) : isVideoUrl(selectedExercise.gifUrl) && !forceImageFallback ? (
              <video
                src={selectedExercise.gifUrl}
                className="mt-2 w-full rounded-md border border-cyan-200 object-contain"
                autoPlay
                loop
                muted
                playsInline
                controls
                onError={() => setForceImageFallback(true)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedExercise.gifUrl}
                alt={`${selectedExercise.name} demo`}
                className="mt-2 w-full rounded-md border border-cyan-200 object-contain"
                onError={() => setIsMediaUnavailable(true)}
              />
            )}
          </div>
        ) : null}

        <label className="block text-sm text-slate-700">
          Reps
          <input
            type="number"
            name="reps"
            min={1}
            max={100}
            required
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Weight ({weightUnitLabel(weightUnit)})
          <input
            type="number"
            name="weight"
            min={0}
            step="0.5"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="isWarmup" />
          Warmup set
        </label>

        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition active:translate-y-px active:bg-slate-950 hover:bg-slate-700">
          Add Set
        </button>
      </form>

      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-700">
          Create Exercise In This Session
        </summary>
        <form action={createExerciseForSessionAction} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="sessionId" value={sessionId} />
          <label className="sm:col-span-2 text-xs text-slate-700">
            Exercise Name
            <input
              name="name"
              required
              minLength={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-xs text-slate-700">
            Category
            <select
              name="category"
              defaultValue="strength"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="mobility">Mobility</option>
            </select>
          </label>
          <label className="text-xs text-slate-700">
            Muscle Group
            <input
              name="muscleGroup"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-xs text-slate-700">
            Default Reps
            <input
              type="number"
              name="targetReps"
              min={1}
              max={50}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-xs text-slate-700">
            Default Weight ({weightUnitLabel(weightUnit)})
            <input
              type="number"
              name="targetWeight"
              min={0}
              step="0.5"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <button className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Create Exercise
          </button>
        </form>
      </details>

      {showGifFixModal && selectedExercise ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowGifFixModal(false)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Fix Demo Match</h3>
                <p className="text-xs text-slate-600">
                  Is this one of the exercises below? Pick one to remember it for {selectedExercise.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGifFixModal(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {selectedExercise.gifCandidates.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No fuzzy matches found right now. Please try again later.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {selectedExercise.gifCandidates.map((candidate) => (
                  <li key={candidate.exerciseId} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center">
                      {
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={candidate.gifUrl}
                          alt={`${candidate.name} demo`}
                          className="w-full rounded border border-slate-200 object-contain"
                        />
                      }
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{candidate.name}</p>
                        <p className="text-xs text-slate-600">Match score: {candidate.score.toFixed(1)}</p>
                      </div>
                      <form action={setExerciseGifOverrideAction}>
                        <input type="hidden" name="sessionId" value={sessionId} />
                        <input type="hidden" name="exerciseId" value={selectedExercise.id} />
                        <input type="hidden" name="gifUrl" value={candidate.gifUrl} />
                        <input type="hidden" name="sourceExerciseId" value={candidate.exerciseId} />
                        <input type="hidden" name="sourceName" value={candidate.name} />
                        <button className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-900 hover:bg-cyan-100">
                          Use This Demo
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
