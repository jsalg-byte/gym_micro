"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FlyoverSelect } from "@/components/flyover-select";
import {
  addExerciseToRoutineDayAction,
  createAndAttachExerciseToRoutineDayAction,
  deleteRoutineDayAction,
  reorderRoutineDayExerciseAction,
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
  const [dayName, setDayName] = useState(day.dayName);
  const [isSavingDay, startSavingDay] = useTransition();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  useEffect(() => {
    setDayName(day.dayName);
  }, [day.dayName, open]);

  const canSaveDay = useMemo(() => {
    const next = dayName.trim();
    const original = day.dayName.trim();
    return next.length >= 2 && next !== original && !isSavingDay;
  }, [dayName, day.dayName, isSavingDay]);

  async function saveDayAction(formData: FormData) {
    if (!canSaveDay) { return; }
    startSavingDay(() => {
      void updateRoutineDayAction(formData).then(() => {
        setOpen(false);
      });
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground">{day.dayName}</h4>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          >
            Edit Day
          </button>
        </div>

        <ul className="space-y-2">
          {dayExercises.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between rounded-xl border border-line/50 bg-background/50 px-4 py-3 group hover:border-foreground/10 transition-all">
              <span className="text-sm font-bold text-foreground">{entry.exerciseName}</span>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-surface px-2 py-1 text-[10px] font-bold text-muted">
                  {entry.targetSets} <span className="text-[9px] uppercase tracking-tighter opacity-70">Sets</span>
                </span>
                {entry.targetReps && (
                  <span className="rounded-lg bg-surface px-2 py-1 text-[10px] font-bold text-muted">
                    {entry.targetReps} <span className="text-[9px] uppercase tracking-tighter opacity-70">Reps</span>
                  </span>
                )}
                {entry.targetWeight && (
                  <span className="rounded-lg bg-accent-cyan/10 px-2 py-1 text-[10px] font-bold text-accent-cyan ring-1 ring-accent-cyan/20">
                    {entry.targetWeight}{weightUnitLabel(weightUnit)}
                  </span>
                )}
              </div>
            </li>
          ))}
          {dayExercises.length === 0 && (
            <li className="text-[10px] font-bold uppercase tracking-wider text-muted italic text-center py-2">
              No exercises added yet.
            </li>
          )}
        </ul>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity"
            onClick={() => setOpen(false)}
          />

          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-line bg-surface shadow-2xl transition-transform animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/80 p-6 backdrop-blur-lg">
              <div>
                <h3 className="text-xl font-black text-foreground">Edit {day.dayName}</h3>
                <p className="text-xs font-medium text-muted">Manage settings and exercises for this day.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-line bg-background p-2 text-muted transition-all hover:text-foreground hover:bg-foreground/5"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-8 p-6">
              {/* Day Settings */}
              <section className="rounded-3xl border border-line bg-background p-6 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">Day Settings</h4>
                <div className="mt-4 space-y-4">
                  <form action={saveDayAction} className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
                    <input type="hidden" name="routineDayId" value={day.id} />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Day Name</label>
                      <input
                        name="dayName"
                        value={dayName}
                        onChange={(e) => setDayName(e.target.value)}
                        required
                        className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
                      />
                    </div>
                    <button
                      disabled={!canSaveDay}
                      className={`h-[46px] rounded-2xl px-6 text-xs font-black uppercase tracking-widest transition-all ${
                        canSaveDay
                          ? "bg-accent-pink text-white shadow-lg shadow-accent-pink/20 hover:scale-[1.02]"
                          : "bg-line text-muted cursor-not-allowed"
                      }`}
                    >
                      {isSavingDay ? "..." : "Save"}
                    </button>
                  </form>

                  <form action={deleteRoutineDayAction} className="pt-4 border-t border-line/50">
                    <input type="hidden" name="routineDayId" value={day.id} />
                    <button className="text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors">
                      Delete this day
                    </button>
                  </form>
                </div>
              </section>

              {/* Current Exercises */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">Current Exercises</h4>
                  <span className="text-[10px] font-bold text-muted bg-line px-2 py-0.5 rounded-full">{dayExercises.length}</span>
                </div>
                
                <ul className="space-y-3">
                  {dayExercises.map((entry, index) => (
                    <li key={entry.id} className="rounded-2xl border border-line bg-background p-4 shadow-sm transition-all hover:border-foreground/10 group">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-black text-foreground">{entry.exerciseName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-md">{entry.targetSets} sets</span>
                            {entry.targetReps && <span className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-md">× {entry.targetReps} reps</span>}
                            {entry.targetWeight && <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-md">{entry.targetWeight}{weightUnitLabel(weightUnit)}</span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <form action={reorderRoutineDayExerciseAction}>
                            <input type="hidden" name="routineDayExerciseId" value={entry.id} /><input type="hidden" name="direction" value="up" />
                            <button disabled={index === 0} className="rounded-lg p-2 text-muted border border-line hover:text-foreground hover:bg-foreground/5 disabled:opacity-30">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                            </button>
                          </form>
                          <form action={reorderRoutineDayExerciseAction}>
                            <input type="hidden" name="routineDayExerciseId" value={entry.id} /><input type="hidden" name="direction" value="down" />
                            <button disabled={index === dayExercises.length - 1} className="rounded-lg p-2 text-muted border border-line hover:text-foreground hover:bg-foreground/5 disabled:opacity-30">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          </form>
                          <form action={removeExerciseFromRoutineDayAction}>
                            <input type="hidden" name="routineDayExerciseId" value={entry.id} />
                            <button className="rounded-lg p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </form>
                        </div>
                      </div>
                    </li>
                  ))}
                  {dayExercises.length === 0 && <li className="text-xs text-muted italic text-center py-4">No exercises listed yet.</li>}
                </ul>
              </section>

              {/* Add Exercise */}
              <section className="rounded-3xl border border-line bg-background p-6 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">Add Existing Exercise</h4>
                <form action={addExerciseToRoutineDayAction} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="routineDayId" value={day.id} />
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Exercise</label>
                    <FlyoverSelect
                      name="exerciseId"
                      label="Exercise"
                      panelTitle="Add existing exercise"
                      options={allExercises.map((ex) => ({
                        value: ex.id,
                        label: ex.name,
                      }))}
                      required
                      searchable
                      triggerClassName="bg-surface focus:border-accent-cyan focus:ring-accent-cyan/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Sets</label>
                    <input type="number" name="targetSets" min={1} defaultValue={3} className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent-cyan ring-accent-cyan/10 focus:ring-4 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Reps</label>
                    <input type="number" name="targetReps" min={1} className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent-cyan ring-accent-cyan/10 focus:ring-4 transition-all" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Weight ({weightUnitLabel(weightUnit)})</label>
                    <input type="number" name="targetWeight" min={0} step="0.5" className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent-cyan ring-accent-cyan/10 focus:ring-4 transition-all" />
                  </div>
                  <button className="sm:col-span-2 rounded-2xl bg-accent-cyan px-4 py-4 text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-accent-cyan/10 transition-all hover:scale-[1.01] active:scale-95">
                    Add to Day
                  </button>
                </form>
              </section>

              {/* Create New Exercise */}
              <section className="rounded-3xl border border-accent-cyan/20 bg-accent-cyan/5 p-6 shadow-inner transition-colors">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent-cyan">Create + Add New Exercise</h4>
                <form action={createAndAttachExerciseToRoutineDayAction} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="routineDayId" value={day.id} />
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-cyan/60 ml-1">Exercise Name</label>
                    <input name="name" required minLength={2} placeholder="e.g. Incline DB Press" className="w-full rounded-2xl border border-accent-cyan/20 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent-cyan ring-accent-cyan/10 focus:ring-4 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-cyan/60 ml-1">Category</label>
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
                      triggerClassName="border-accent-cyan/20 bg-background focus:border-accent-cyan focus:ring-accent-cyan/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-cyan/60 ml-1">Muscle Group</label>
                    <input name="muscleGroup" placeholder="e.g. Chest" className="w-full rounded-2xl border border-accent-cyan/20 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent-cyan ring-accent-cyan/10 focus:ring-4 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-cyan/60 ml-1">Sets</label>
                    <input type="number" name="targetSets" min={1} defaultValue={3} className="w-full rounded-2xl border border-accent-cyan/20 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent-cyan ring-accent-cyan/10 focus:ring-4 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent-cyan/60 ml-1">Reps</label>
                    <input type="number" name="targetReps" min={1} className="w-full rounded-2xl border border-accent-cyan/20 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent-cyan ring-accent-cyan/10 focus:ring-4 transition-all" />
                  </div>
                  <button className="sm:col-span-2 rounded-2xl bg-foreground px-4 py-4 text-[10px] font-black uppercase tracking-widest text-background transition-all hover:opacity-90 active:scale-95">
                    Create & Add
                  </button>
                </form>
              </section>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
