"use client";

import { useEffect, useMemo, useState } from "react";
import { weightUnitLabel, type WeightUnit } from "@/lib/weight-unit";

const ACTIVE_EXERCISE_STORAGE_PREFIX = "gym-micro:session-active-exercise";
const ACTIVE_EXERCISE_EVENT = "gym-micro:session-active-exercise-change";

type LoggedSet = {
  id: string;
  setOrder: number;
  reps: number;
  weight: string | null;
  isWarmup: boolean;
};

type LoggedSetGroup = {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
};

type LoggedSetGroupsProps = {
  sessionId: string;
  weightUnit: WeightUnit;
  groups: LoggedSetGroup[];
};

export function LoggedSetGroups({ sessionId, weightUnit, groups }: LoggedSetGroupsProps) {
  const storageKey = `${ACTIVE_EXERCISE_STORAGE_PREFIX}:${sessionId}`;
  const validExerciseIds = useMemo(() => new Set(groups.map((group) => group.exerciseId)), [groups]);
  const [expandedExerciseId, setExpandedExerciseId] = useState(groups[0]?.exerciseId ?? "");

  useEffect(() => {
    const fromStorage = window.localStorage.getItem(storageKey);
    if (fromStorage && validExerciseIds.has(fromStorage)) {
      setExpandedExerciseId(fromStorage);
      return;
    }
    if (groups[0]) {
      setExpandedExerciseId(groups[0].exerciseId);
    }
  }, [groups, storageKey, validExerciseIds]);

  useEffect(() => {
    function onActiveExerciseChange(event: Event) {
      const custom = event as CustomEvent<{ sessionId?: string; exerciseId?: string }>;
      const eventSessionId = custom.detail?.sessionId;
      const exerciseId = custom.detail?.exerciseId;
      if (!eventSessionId || eventSessionId !== sessionId || !exerciseId) {
        return;
      }
      if (!validExerciseIds.has(exerciseId)) {
        return;
      }
      setExpandedExerciseId(exerciseId);
    }

    window.addEventListener(ACTIVE_EXERCISE_EVENT, onActiveExerciseChange as EventListener);
    return () => {
      window.removeEventListener(ACTIVE_EXERCISE_EVENT, onActiveExerciseChange as EventListener);
    };
  }, [sessionId, validExerciseIds]);

  if (groups.length === 0) {
    return <p className="text-sm text-slate-500">No sets logged yet.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isExpanded = group.exerciseId === expandedExerciseId;
        return (
          <section key={group.exerciseId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <button
              type="button"
              onClick={() => setExpandedExerciseId(isExpanded ? "" : group.exerciseId)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <p className="text-sm font-bold text-slate-900">{group.exerciseName}</p>
              <span className="rounded-full border border-cyan-300 bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-900">
                {group.sets.length} set{group.sets.length === 1 ? "" : "s"}
              </span>
            </button>

            {isExpanded ? (
              <ul className="mt-2 space-y-2">
                {group.sets.map((set, index) => (
                  <li key={set.id} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
                    <p className="font-semibold text-slate-900">
                      Set {index + 1} (overall #{set.setOrder})
                    </p>
                    <p className="text-slate-600">
                      {set.reps} reps @ {set.weight ?? "0"} {weightUnitLabel(weightUnit)} {set.isWarmup ? "(warmup)" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
