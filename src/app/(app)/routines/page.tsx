import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  exercises,
  routineDayExercises,
  routineDays,
  routines,
  userPreferences,
} from "@/db/schema";
import { RoutineDayFlyover } from "@/components/routine-day-flyover";
import { requireUserId } from "@/lib/session";
import { normalizeWeightUnit } from "@/lib/weight-unit";
import {
  createRoutineAction,
  createRoutineDayAction,
  setActiveRoutineAction,
} from "@/server/actions";
import { DeleteRoutineButton } from "@/components/delete-routine-button";

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
  const weightUnit = normalizeWeightUnit(activePref?.weightUnit);

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
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">How Workout Plans Work</h2>
          <p className="mt-2 text-sm text-slate-600">
            A workout plan is your weekly structure. Add one or more plan days, attach exercises to each day, then set
            a plan as active on Sessions to start logging.
          </p>
        </section>

        <section className="panel p-4">
          <h1 className="text-xl font-black text-slate-900">Create Workout Plan</h1>
          <p className="mt-1 text-xs text-slate-600">Every new workout plan starts with Day 1 automatically.</p>
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
              Save Workout Plan
            </button>
          </form>
        </section>
      </aside>

      <section className="space-y-3">
        <h2 className="text-xl font-black text-slate-900">Your Workout Plans</h2>
        {routineItems.length === 0 ? <p className="text-sm text-slate-500">No workout plans yet.</p> : null}
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
                      {isActive ? "Active Plan" : "Set Active"}
                    </button>
                  </form>
                  <DeleteRoutineButton routineId={routine.id} routineName={routine.name} />
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
                    <RoutineDayFlyover
                      key={day.id}
                      day={{
                        id: day.id,
                        dayName: day.dayName,
                      }}
                      weightUnit={weightUnit}
                      dayExercises={dayExercises.map((entry) => ({
                        id: entry.id,
                        exerciseName: entry.exerciseName,
                        targetSets: entry.targetSets,
                        targetReps: entry.targetReps,
                        targetWeight: entry.targetWeight ? String(entry.targetWeight) : null,
                      }))}
                      allExercises={allExercises.map((exercise) => ({
                        id: exercise.id,
                        name: exercise.name,
                      }))}
                    />
                  );
                })}
                {days.length === 0 ? (
                  <p className="text-xs text-slate-500">Add days to structure this workout plan.</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
