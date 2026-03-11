"use client";

import { useState } from "react";
import {
  addExerciseToRoutineDayAction,
  createAndAttachExerciseToRoutineDayAction,
  deleteRoutineDayAction,
  removeExerciseFromRoutineDayAction,
  updateRoutineDayAction,
} from "@/server/actions";
import { weightUnitLabel, type WeightUnit } from "@/lib/weight-unit";

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

type RoutineDayFlyoverProps = {
  day: {
    id: string;
    dayName: string;
  };
  weightUnit: WeightUnit;
  dayExercises: DayExerciseEntry[];
  allExercises: ExerciseOption[];
};

export function RoutineDayFlyover({ day, weightUnit, dayExercises, allExercises }: RoutineDayFlyoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-900">{day.dayName}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
          >
            Edit Day
          </button>
        </div>

        <ul className="mt-2 space-y-1">
          {dayExercises.map((entry) => (
            <li key={entry.id} className="text-xs text-slate-700">
              {entry.exerciseName} - Sets: {entry.targetSets}
              {entry.targetReps ? ` | Reps: ${entry.targetReps}` : " | Reps: -"}
              {entry.targetWeight ? ` | Weight: ${entry.targetWeight}${weightUnitLabel(weightUnit)}` : ""}
            </li>
          ))}
          {dayExercises.length === 0 ? <li className="text-xs text-slate-500">No exercises yet for this day.</li> : null}
        </ul>
      </section>

      {open ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close day editor"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <aside className="absolute inset-y-0 right-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit {day.dayName}</h3>
                <p className="text-xs text-slate-600">Rename, delete, and manage exercises for this day.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Day Settings</h4>
                <form action={updateRoutineDayAction} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="routineDayId" value={day.id} />
                  <label className="block flex-1 text-xs text-slate-700">
                    Day Name
                    <input
                      name="dayName"
                      defaultValue={day.dayName}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                  <button className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    Save Day
                  </button>
                </form>

                <form action={deleteRoutineDayAction} className="mt-2">
                  <input type="hidden" name="routineDayId" value={day.id} />
                  <button className="rounded border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                    Delete Day
                  </button>
                </form>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Current Exercises</h4>
                <ul className="mt-2 space-y-2">
                  {dayExercises.map((entry) => (
                    <li key={entry.id} className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {entry.exerciseName} - Sets: {entry.targetSets}
                          {entry.targetReps ? ` | Reps: ${entry.targetReps}` : " | Reps: -"}
                          {entry.targetWeight ? ` | Weight: ${entry.targetWeight}${weightUnitLabel(weightUnit)}` : ""}
                        </span>
                        <form action={removeExerciseFromRoutineDayAction}>
                          <input type="hidden" name="routineDayExerciseId" value={entry.id} />
                          <button className="rounded border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">
                            Remove
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                  {dayExercises.length === 0 ? <li className="text-xs text-slate-500">No exercises yet.</li> : null}
                </ul>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Add Existing Exercise</h4>
                <form action={addExerciseToRoutineDayAction} className="mt-2 grid gap-2 sm:grid-cols-5">
                  <input type="hidden" name="routineDayId" value={day.id} />
                  <label className="sm:col-span-2 text-[11px] text-slate-700">
                    Exercise
                    <select
                      name="exerciseId"
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    >
                      {allExercises.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] text-slate-700">
                    Sets
                    <input
                      type="number"
                      name="targetSets"
                      min={1}
                      max={20}
                      defaultValue={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <label className="text-[11px] text-slate-700">
                    Reps
                    <input
                      type="number"
                      name="targetReps"
                      min={1}
                      max={50}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <label className="text-[11px] text-slate-700">
                    Weight ({weightUnitLabel(weightUnit)})
                    <input
                      type="number"
                      name="targetWeight"
                      min={0}
                      step="0.5"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <button className="sm:col-span-5 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    Add Existing Exercise
                  </button>
                </form>
              </section>

              <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-cyan-900">Create + Add New Exercise</h4>
                <form action={createAndAttachExerciseToRoutineDayAction} className="mt-2 grid gap-2 sm:grid-cols-6">
                  <input type="hidden" name="routineDayId" value={day.id} />
                  <label className="sm:col-span-2 text-[11px] text-slate-700">
                    Exercise Name
                    <input
                      name="name"
                      required
                      minLength={2}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <label className="text-[11px] text-slate-700">
                    Category
                    <select
                      name="category"
                      defaultValue="strength"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    >
                      <option value="strength">Strength</option>
                      <option value="cardio">Cardio</option>
                      <option value="mobility">Mobility</option>
                    </select>
                  </label>
                  <label className="sm:col-span-2 text-[11px] text-slate-700">
                    Muscle Group
                    <input
                      name="muscleGroup"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <label className="text-[11px] text-slate-700">
                    Sets
                    <input
                      type="number"
                      name="targetSets"
                      min={1}
                      max={20}
                      defaultValue={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <label className="text-[11px] text-slate-700">
                    Reps
                    <input
                      type="number"
                      name="targetReps"
                      min={1}
                      max={50}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <label className="text-[11px] text-slate-700">
                    Weight ({weightUnitLabel(weightUnit)})
                    <input
                      type="number"
                      name="targetWeight"
                      min={0}
                      step="0.5"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                    />
                  </label>
                  <button className="sm:col-span-6 rounded-lg bg-cyan-900 px-2 py-1.5 text-xs font-semibold text-white hover:bg-cyan-800">
                    Create + Add Exercise
                  </button>
                </form>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
