import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  exercises,
  routineDayExercises,
  routineDays,
  routines,
  userPreferences,
} from "@/db/schema";
import { RoutinePlanList } from "@/components/routine-plan-list";
import { requireUserId } from "@/lib/session";
import { normalizeWeightUnit } from "@/lib/weight-unit";
import { createRoutineAction } from "@/server/actions";

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

  const routineListItems = routineItems.map((routine) => {
    const days = daysByRoutine.get(routine.id) ?? [];

    return {
      id: routine.id,
      name: routine.name,
      description: routine.description,
      isActive: activePref?.activeRoutineId === routine.id,
      days: days.map((day) => ({
        id: day.id,
        dayName: day.dayName,
        exercises: (exercisesByDay.get(day.id) ?? []).map((entry) => ({
          id: entry.id,
          exerciseName: entry.exerciseName,
          targetSets: entry.targetSets,
          targetReps: entry.targetReps,
          targetWeight: entry.targetWeight ? String(entry.targetWeight) : null,
        })),
      })),
    };
  });

  const exerciseOptions = allExercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
  }));

  return (
    <main className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] pb-12 transition-colors">
      <aside className="space-y-6">
        <section className="rounded-3xl border border-line bg-surface/50 p-6 backdrop-blur-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted">How Plans Work</h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted/80">
            A workout plan is your weekly structure. Add days, attach exercises, and set a plan as active to start logging.
          </p>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-6 shadow-xl">
          <h1 className="text-xl font-black text-foreground">Create Plan</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">Starts with Day 1</p>
          <form action={createRoutineAction} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Plan Name</label>
              <input
                type="text"
                name="name"
                required
                minLength={2}
                placeholder="e.g. PPL Hypertrophy"
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Focus on compound movements..."
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
              />
            </div>
            <button className="w-full rounded-2xl bg-foreground px-4 py-4 text-sm font-black uppercase tracking-widest text-background transition-all hover:opacity-90 active:scale-95">
              Save Plan
            </button>
          </form>
        </section>
      </aside>

      <section className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight text-foreground px-2">Your Workout Plans</h2>
        {routineItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line p-12 text-center">
            <p className="text-sm font-medium text-muted">No workout plans yet. Create your first one to get started.</p>
          </div>
        ) : null}
        
        <RoutinePlanList
          routines={routineListItems}
          allExercises={exerciseOptions}
          weightUnit={weightUnit}
        />
      </section>
    </main>
  );
}
