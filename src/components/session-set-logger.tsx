"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addWorkoutSetAction,
  createExerciseForSessionAction,
} from "@/server/actions";
import { ExerciseDemoSourceForm } from "@/components/exercise-demo-source-form";
import { ExerciseMedia } from "@/components/exercise-media";
import { FlyoverSelect } from "@/components/flyover-select";
import type { ExerciseDemoReview } from "@/lib/exercise-gifs";
import { weightUnitLabel, type WeightUnit } from "@/lib/weight-unit";

type ExerciseOption = {
  id: string;
  name: string;
  category: string;
  muscleGroup: string | null;
  gifUrl: string | null;
  demo: ExerciseDemoReview;
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
const REST_TIMER_START_EVENT = "gym-micro:rest-timer-start";

function getDemoStatus(demo: ExerciseDemoReview) {
  if (demo.media.mediaType === "external" && demo.media.localPath) {
    return "External";
  }

  if (demo.media.localPath) {
    return "Downloaded";
  }

  if (demo.seed?.approved && demo.seed.youtubeUrl) {
    return "Source saved";
  }

  if (demo.media.status === "none" || demo.seed?.mediaType === "none") {
    return "No demo needed";
  }

  return "Needs source";
}

export function SessionSetLogger({
  sessionId,
  weightUnit,
  exerciseOptions,
  initialExerciseId,
}: SessionSetLoggerProps) {
  const activeExerciseStorageKey = `${ACTIVE_EXERCISE_STORAGE_PREFIX}:${sessionId}`;
  const hydratedStorageKeyRef = useRef<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState(initialExerciseId);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [isDemoHidden, setIsDemoHidden] = useState(false);

  function startRestTimer() {
    window.dispatchEvent(
      new CustomEvent(REST_TIMER_START_EVENT, {
        detail: {
          storageKey: `session:${sessionId}`,
        },
      }),
    );
  }

  const selectedExercise = useMemo(
    () => exerciseOptions.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exerciseOptions, selectedExerciseId],
  );

  const persistActiveExercise = useCallback((exerciseId: string) => {
    if (!exerciseId) {
      return;
    }

    window.localStorage.setItem(activeExerciseStorageKey, exerciseId);
    window.dispatchEvent(
      new CustomEvent(ACTIVE_EXERCISE_EVENT, {
        detail: {
          sessionId,
          exerciseId,
        },
      }),
    );
  }, [activeExerciseStorageKey, sessionId]);

  useEffect(() => {
    const options = new Set(exerciseOptions.map((exercise) => exercise.id));
    if (options.size === 0) {
      setSelectedExerciseId("");
      return;
    }

    if (hydratedStorageKeyRef.current !== activeExerciseStorageKey) {
      hydratedStorageKeyRef.current = activeExerciseStorageKey;
      const stored = window.localStorage.getItem(activeExerciseStorageKey);
      if (stored && options.has(stored)) {
        setSelectedExerciseId(stored);
        return;
      }
    }

    if (selectedExerciseId && options.has(selectedExerciseId)) {
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
      return;
    }

    setReps(selectedExercise.prefillReps ? String(selectedExercise.prefillReps) : "");
    setWeight(selectedExercise.prefillWeight ?? "");
  }, [selectedExercise]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }
    persistActiveExercise(selectedExerciseId);
  }, [selectedExerciseId, persistActiveExercise]);

  return (
    <div className="space-y-3">
      <div className="block text-sm text-slate-700">
        <span>Exercise</span>
        <FlyoverSelect
          name="exerciseIdPicker"
          required
          value={selectedExerciseId}
          onValueChange={setSelectedExerciseId}
          label="Exercise"
          panelTitle="Choose exercise"
          options={exerciseOptions.map((exercise) => ({
            value: exercise.id,
            label: exercise.name,
          }))}
          searchable
          className="mt-1"
          triggerClassName="rounded-lg py-2"
        />
      </div>

      {selectedExercise ? (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900">Exercise Demo</p>
              <p className="mt-0.5 text-[11px] font-medium text-cyan-900/70">
                {getDemoStatus(selectedExercise.demo)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDemoHidden((current) => !current)}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-cyan-400 bg-cyan-100 text-base font-black leading-none text-cyan-900 hover:bg-cyan-200"
              aria-label={isDemoHidden ? "Show demo" : "Hide demo"}
            >
              {isDemoHidden ? "+" : "−"}
            </button>
          </div>
          {isDemoHidden ? null : (
            <div className="mt-2 space-y-3">
              <ExerciseMedia
                src={selectedExercise.gifUrl}
                name={selectedExercise.name}
                mediaType={selectedExercise.demo.media.mediaType}
                autoPlay
                className="mt-2 border border-cyan-200 bg-white object-contain"
              />

              <ExerciseDemoSourceForm
                exerciseId={selectedExercise.id}
                slug={selectedExercise.demo.media.slug}
                exerciseName={selectedExercise.name}
                category={selectedExercise.category}
                muscleGroup={selectedExercise.muscleGroup}
                youtubeUrl={selectedExercise.demo.seed?.youtubeUrl ?? selectedExercise.demo.media.sourceUrl}
                start={selectedExercise.demo.seed?.start}
                duration={selectedExercise.demo.seed?.duration}
                variant="compact"
              />

              <div className="flex flex-wrap gap-2">
                {selectedExercise.demo.queries.map((query) => (
                  <a
                    key={`${selectedExercise.id}-${query.label}-${query.query}`}
                    href={query.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-900 hover:border-cyan-500"
                  >
                    {query.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <form
        action={addWorkoutSetAction}
        className="space-y-3"
        onSubmit={() => {
          persistActiveExercise(selectedExerciseId);
          startRestTimer();
        }}
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="exerciseId" value={selectedExerciseId} />

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
          <div className="text-xs text-slate-700">
            <span>Category</span>
            <FlyoverSelect
              name="category"
              defaultValue="strength"
              label="Category"
              panelTitle="Choose category"
              options={[
                { value: "strength", label: "Strength" },
                { value: "cardio", label: "Cardio" },
                { value: "mobility", label: "Mobility" },
              ]}
              required
              className="mt-1"
              triggerClassName="rounded-lg py-2"
            />
          </div>
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

    </div>
  );
}
