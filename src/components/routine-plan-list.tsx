"use client";

import { useState } from "react";
import { DeleteRoutineButton } from "@/components/delete-routine-button";
import { RoutineDayFlyover } from "@/components/routine-day-flyover";
import {
  createRoutineDayAction,
  setActiveRoutineAction,
  updateRoutineAction,
} from "@/server/actions";
import type { WeightUnit } from "@/lib/weight-unit";

type ExerciseOption = {
  id: string;
  name: string;
};

type DayExerciseEntry = {
  id: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number | null;
  targetWeight: string | null;
};

type RoutineDay = {
  id: string;
  dayName: string;
  exercises: DayExerciseEntry[];
};

type RoutineItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  days: RoutineDay[];
};

type RoutinePlanListProps = {
  routines: RoutineItem[];
  allExercises: ExerciseOption[];
  weightUnit: WeightUnit;
};

export function RoutinePlanList({ routines, allExercises, weightUnit }: RoutinePlanListProps) {
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {routines.map((routine) => {
        const isExpanded = expandedRoutineId === routine.id;

        return (
          <article
            key={routine.id}
            className="rounded-3xl border border-line bg-surface shadow-lg transition-all hover:border-foreground/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <button
                type="button"
                onClick={() => setExpandedRoutineId(isExpanded ? null : routine.id)}
                aria-expanded={isExpanded}
                className="group flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-background text-lg font-black text-foreground transition-all group-hover:bg-foreground group-hover:text-background">
                  {isExpanded ? "-" : "+"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-black text-foreground">
                    {routine.name}
                  </span>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ${
                      routine.isActive
                        ? "bg-accent-cyan/10 text-accent-cyan ring-accent-cyan/20"
                        : "bg-background text-muted ring-line"
                    }`}
                  >
                    {routine.isActive ? "Active Plan" : "Inactive Plan"}
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-2">
                {!routine.isActive && (
                  <form action={setActiveRoutineAction}>
                    <input type="hidden" name="routineId" value={routine.id} />
                    <button className="rounded-xl border border-line bg-background px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground transition-all hover:bg-foreground hover:text-background active:scale-95">
                      Set Active
                    </button>
                  </form>
                )}
                <DeleteRoutineButton routineId={routine.id} routineName={routine.name} />
              </div>
            </div>

            {isExpanded ? (
              <div className="border-t border-line/50 p-5 pt-6">
                <div className="grid gap-4 rounded-2xl border border-line bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <form action={updateRoutineAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <input type="hidden" name="routineId" value={routine.id} />
                    <div className="space-y-1.5">
                      <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted">
                        Plan Name
                      </label>
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={80}
                        defaultValue={routine.name}
                        className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
                      />
                    </div>
                    <button className="rounded-2xl bg-foreground px-5 py-3 text-xs font-black uppercase tracking-widest text-background transition-all hover:opacity-90 active:scale-95">
                      Save Name
                    </button>
                  </form>

                  <p className="text-sm font-medium text-muted md:text-right">
                    {routine.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-8 space-y-6">
                  {routine.days.map((day) => (
                    <div
                      key={day.id}
                      className="rounded-2xl border border-line bg-background p-5 transition-all hover:border-foreground/10"
                    >
                      <RoutineDayFlyover
                        day={{ id: day.id, dayName: day.dayName }}
                        weightUnit={weightUnit}
                        dayExercises={day.exercises}
                        allExercises={allExercises}
                      />
                    </div>
                  ))}

                  {routine.days.length === 0 ? (
                    <p className="py-4 text-center text-xs font-bold italic text-muted">
                      No days added to this plan yet.
                    </p>
                  ) : null}

                  <form
                    action={createRoutineDayAction}
                    className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line bg-background/30 p-4 transition-all hover:border-muted/50"
                  >
                    <input type="hidden" name="routineId" value={routine.id} />
                    <div className="min-w-[200px] flex-1">
                      <input
                        name="dayName"
                        required
                        placeholder="e.g. Monday (Chest & Tris)"
                        className="w-full border-none bg-transparent px-2 py-1 text-sm font-bold text-foreground outline-none placeholder:text-muted/50"
                      />
                    </div>
                    <button className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground transition-all hover:bg-foreground hover:text-background active:scale-95">
                      Add Day
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
