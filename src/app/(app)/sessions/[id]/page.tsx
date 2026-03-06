import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import {
  exercises,
  routineDayExercises,
  routineDays,
  routines,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { addWorkoutSetAction, completeWorkoutSessionAction } from "@/server/actions";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const db = getDb();

  const [session] = await db
    .select({
      id: workoutSessions.id,
      status: workoutSessions.status,
      routineDayId: workoutSessions.routineDayId,
      routineName: routines.name,
      dayName: routineDays.dayName,
      startedAt: workoutSessions.startedAt,
    })
    .from(workoutSessions)
    .leftJoin(routines, eq(workoutSessions.routineId, routines.id))
    .leftJoin(routineDays, eq(workoutSessions.routineDayId, routineDays.id))
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)))
    .limit(1);

  if (!session) {
    notFound();
  }

  const [dayPlannedExercises, sets] = await Promise.all([
    session.routineDayId
      ? db
          .select({
            id: exercises.id,
            name: exercises.name,
          })
          .from(routineDayExercises)
          .innerJoin(exercises, eq(routineDayExercises.exerciseId, exercises.id))
          .where(eq(routineDayExercises.routineDayId, session.routineDayId))
          .orderBy(asc(routineDayExercises.sortOrder))
      : db.select({ id: exercises.id, name: exercises.name }).from(exercises).orderBy(asc(exercises.name)),
    db
      .select({
        id: workoutSets.id,
        setOrder: workoutSets.setOrder,
        reps: workoutSets.reps,
        weight: workoutSets.weight,
        isWarmup: workoutSets.isWarmup,
        exerciseName: exercises.name,
      })
      .from(workoutSets)
      .leftJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .where(eq(workoutSets.sessionId, session.id))
      .orderBy(asc(workoutSets.setOrder)),
  ]);

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Session: {session.routineName ?? "Routine"} / {session.dayName ?? "Day"}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Started {new Date(session.startedAt).toLocaleString()} · Status {session.status}
            </p>
          </div>
          <Link href="/sessions" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Back to sessions
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <article className="panel p-4">
          <h2 className="text-lg font-black text-slate-900">Log Set</h2>
          <form action={addWorkoutSetAction} className="mt-3 space-y-3">
            <input type="hidden" name="sessionId" value={session.id} />
            <label className="block text-sm text-slate-700">
              Exercise
              <select
                name="exerciseId"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {dayPlannedExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Reps
              <input
                type="number"
                name="reps"
                min={1}
                max={100}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Weight
              <input
                type="number"
                name="weight"
                min={0}
                step="0.5"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isWarmup" />
              Warmup set
            </label>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Add Set
            </button>
          </form>
        </article>

        <article className="panel p-4">
          <h2 className="text-lg font-black text-slate-900">Logged Sets</h2>
          <ul className="mt-3 space-y-2">
            {sets.map((set) => (
              <li key={set.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">
                  #{set.setOrder} {set.exerciseName ?? "Exercise"}
                </p>
                <p className="text-slate-600">
                  {set.reps} reps @ {set.weight ?? "0"} kg {set.isWarmup ? "(warmup)" : ""}
                </p>
              </li>
            ))}
            {sets.length === 0 ? <li className="text-sm text-slate-500">No sets logged yet.</li> : null}
          </ul>
          {session.status !== "completed" ? (
            <form action={completeWorkoutSessionAction} className="mt-3">
              <input type="hidden" name="sessionId" value={session.id} />
              <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                Complete Session
              </button>
            </form>
          ) : null}
        </article>
      </section>
    </main>
  );
}
