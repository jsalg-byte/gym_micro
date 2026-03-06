import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  exercises,
  routineDayExercises,
  routineDays,
  routines,
  userPreferences,
} from "@/db/schema";
import { requireUserId } from "@/lib/session";
import {
  addExerciseToRoutineDayAction,
  createRoutineAction,
  createRoutineDayAction,
  deleteRoutineAction,
  removeExerciseFromRoutineDayAction,
  setActiveRoutineAction,
} from "@/server/actions";

export default async function RoutinesPage() {
  const userId = await requireUserId();
  const db = getDb();
  const routineItems = await db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(desc(routines.createdAt));

  const routineIds = routineItems.map((routine) => routine.id);
  const dayItems =
    routineIds.length > 0
      ? await db
          .select()
          .from(routineDays)
          .where(inArray(routineDays.routineId, routineIds))
          .orderBy(asc(routineDays.routineId), asc(routineDays.sortOrder))
      : [];

  const dayIds = dayItems.map((day) => day.id);
  const dayExerciseItems =
    dayIds.length > 0
      ? await db
          .select({
            id: routineDayExercises.id,
            routineDayId: routineDayExercises.routineDayId,
            sortOrder: routineDayExercises.sortOrder,
            targetSets: routineDayExercises.targetSets,
            targetReps: routineDayExercises.targetReps,
            targetWeight: routineDayExercises.targetWeight,
            exerciseName: exercises.name,
          })
          .from(routineDayExercises)
          .innerJoin(exercises, eq(routineDayExercises.exerciseId, exercises.id))
          .where(inArray(routineDayExercises.routineDayId, dayIds))
          .orderBy(asc(routineDayExercises.routineDayId), asc(routineDayExercises.sortOrder))
      : [];

  const [allExercises, activePref] = await Promise.all([
    db.select().from(exercises).orderBy(asc(exercises.name)),
    db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const daysByRoutine = new Map<string, typeof dayItems>();
  for (const day of dayItems) {
    const list = daysByRoutine.get(day.routineId) ?? [];
    list.push(day);
    daysByRoutine.set(day.routineId, list);
  }

  const exercisesByDay = new Map<string, typeof dayExerciseItems>();
  for (const dayExercise of dayExerciseItems) {
    const list = exercisesByDay.get(dayExercise.routineDayId) ?? [];
    list.push(dayExercise);
    exercisesByDay.set(dayExercise.routineDayId, list);
  }

  return (
    <main className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="panel p-4">
          <h1 className="text-xl font-black text-slate-900">Create Routine</h1>
          <p className="mt-1 text-xs text-slate-600">Every new routine starts with Day 1 automatically.</p>
          <form action={createRoutineAction} className="mt-3 space-y-3">
            <label className="block text-sm text-slate-700">
              Name
              <input
                type="text"
                name="name"
                required
                minLength={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Description
              <textarea
                name="description"
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Save Routine
            </button>
          </form>
        </section>
      </aside>

      <section className="space-y-3">
        <h2 className="text-xl font-black text-slate-900">Your Routines</h2>
        {routineItems.length === 0 ? <p className="text-sm text-slate-500">No routines yet.</p> : null}
        {routineItems.map((routine) => {
          const days = daysByRoutine.get(routine.id) ?? [];
          const isActive = activePref?.activeRoutineId === routine.id;

          return (
            <article key={routine.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-900">{routine.name}</p>
                  <p className="text-sm text-slate-600">{routine.description || "No description."}</p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={setActiveRoutineAction}>
                    <input type="hidden" name="routineId" value={routine.id} />
                    <button
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {isActive ? "Active Routine" : "Set Active"}
                    </button>
                  </form>
                  <form action={deleteRoutineAction}>
                    <input type="hidden" name="routineId" value={routine.id} />
                    <button className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                      Delete Routine
                    </button>
                  </form>
                </div>
              </div>

              <form action={createRoutineDayAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="routineId" value={routine.id} />
                <label className="block text-xs text-slate-600">
                  Day Name
                  <input
                    name="dayName"
                    required
                    placeholder="Monday"
                    className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                  />
                </label>
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  Add Day
                </button>
              </form>

              <div className="mt-3 space-y-3">
                {days.map((day) => {
                  const dayExercises = exercisesByDay.get(day.id) ?? [];
                  return (
                    <section key={day.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-bold text-slate-900">{day.dayName}</p>
                      <ul className="mt-2 space-y-1">
                        {dayExercises.map((entry) => (
                          <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                            <span>
                              {entry.exerciseName} - {entry.targetSets} sets
                              {entry.targetReps ? ` x ${entry.targetReps}` : ""}
                              {entry.targetWeight ? ` @ ${entry.targetWeight}kg` : ""}
                            </span>
                            <form action={removeExerciseFromRoutineDayAction}>
                              <input type="hidden" name="routineDayExerciseId" value={entry.id} />
                              <button className="rounded border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">
                                Remove
                              </button>
                            </form>
                          </li>
                        ))}
                        {dayExercises.length === 0 ? (
                          <li className="text-xs text-slate-500">No exercises yet for this day.</li>
                        ) : null}
                      </ul>

                      <form action={addExerciseToRoutineDayAction} className="mt-2 grid gap-2 sm:grid-cols-5">
                        <input type="hidden" name="routineDayId" value={day.id} />
                        <select
                          name="exerciseId"
                          required
                          className="sm:col-span-2 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                        >
                          {allExercises.map((exercise) => (
                            <option key={exercise.id} value={exercise.id}>
                              {exercise.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          name="targetSets"
                          min={1}
                          max={20}
                          defaultValue={3}
                          placeholder="Sets"
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                        />
                        <input
                          type="number"
                          name="targetReps"
                          min={1}
                          max={50}
                          placeholder="Reps"
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
                        />
                        <button className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          Add Exercise
                        </button>
                      </form>
                    </section>
                  );
                })}
                {days.length === 0 ? <p className="text-xs text-slate-500">Add days to structure this routine.</p> : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
