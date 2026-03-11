import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import {
  exercises,
  routineDayExercises,
  routineDays,
  routines,
  userPreferences,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { resolveExerciseGifUrl } from "@/lib/exercise-gifs";
import { requireUserId } from "@/lib/session";
import { normalizeWeightUnit } from "@/lib/weight-unit";
import {
  cancelWorkoutSessionAction,
  completeWorkoutSessionAction,
} from "@/server/actions";
import { RestTimer } from "@/components/rest-timer";
import { SessionSetLogger } from "@/components/session-set-logger";

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

  const [dayPlannedExercises, sets, prefs] = await Promise.all([
    session.routineDayId
      ? db
          .select({
            id: exercises.id,
            name: exercises.name,
            targetReps: routineDayExercises.targetReps,
            targetWeight: routineDayExercises.targetWeight,
          })
          .from(routineDayExercises)
          .innerJoin(exercises, eq(routineDayExercises.exerciseId, exercises.id))
          .where(eq(routineDayExercises.routineDayId, session.routineDayId))
          .orderBy(asc(routineDayExercises.sortOrder))
      : db
          .select({
            id: exercises.id,
            name: exercises.name,
            targetReps: routineDayExercises.targetReps,
            targetWeight: routineDayExercises.targetWeight,
          })
          .from(exercises)
          .leftJoin(routineDayExercises, eq(routineDayExercises.exerciseId, exercises.id))
          .orderBy(asc(exercises.name)),
    db
      .select({
        id: workoutSets.id,
        exerciseId: workoutSets.exerciseId,
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
    db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);
  const weightUnit = normalizeWeightUnit(prefs?.weightUnit);

  const exerciseIds = dayPlannedExercises.map((exercise) => exercise.id);
  const recentExerciseSets =
    exerciseIds.length > 0
      ? await db
          .select({
            exerciseId: workoutSets.exerciseId,
            reps: workoutSets.reps,
            weight: workoutSets.weight,
            createdAt: workoutSets.createdAt,
          })
          .from(workoutSets)
          .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
          .where(
            and(
              eq(workoutSessions.userId, userId),
              inArray(workoutSets.exerciseId, exerciseIds),
            ),
          )
          .orderBy(desc(workoutSets.createdAt))
      : [];

  const recentByExercise = new Map<
    string,
    {
      reps: number;
      weight: string | null;
    }
  >();
  for (const row of recentExerciseSets) {
    if (recentByExercise.has(row.exerciseId)) {
      continue;
    }
    recentByExercise.set(row.exerciseId, {
      reps: row.reps,
      weight: row.weight !== null ? String(row.weight) : null,
    });
  }

  const exerciseOptions = dayPlannedExercises.map((exercise) => {
    const recent = recentByExercise.get(exercise.id);
    return {
      id: exercise.id,
      name: exercise.name,
      gifUrl: resolveExerciseGifUrl(exercise.name),
      prefillReps: recent?.reps ?? exercise.targetReps ?? null,
      prefillWeight:
        recent?.weight ?? (exercise.targetWeight !== null ? String(exercise.targetWeight) : null),
    };
  });

  const initialExerciseId = sets[sets.length - 1]?.exerciseId ?? exerciseOptions[0]?.id ?? "";

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Session: {session.routineName ?? "Workout Plan"} / {session.dayName ?? "Day"}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Started {new Date(session.startedAt).toLocaleString()} · Status {session.status}
            </p>
          </div>
          <Link
            href="/sessions"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to sessions
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <article className="panel p-4">
          <h2 className="text-lg font-black text-slate-900">Log Set</h2>
          {session.status === "active" && exerciseOptions.length > 0 ? (
            <SessionSetLogger
              sessionId={session.id}
              weightUnit={weightUnit}
              exerciseOptions={exerciseOptions}
              initialExerciseId={initialExerciseId}
            />
          ) : (
            <p className="mt-3 text-sm text-slate-600">Session is not active or has no exercises to log.</p>
          )}
          <div className="mt-3">
            <RestTimer storageKey={`session:${session.id}`} />
          </div>
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
                  {set.reps} reps @ {set.weight ?? "0"} {weightUnit} {set.isWarmup ? "(warmup)" : ""}
                </p>
              </li>
            ))}
            {sets.length === 0 ? <li className="text-sm text-slate-500">No sets logged yet.</li> : null}
          </ul>
          {session.status === "active" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={completeWorkoutSessionAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                  Complete Session
                </button>
              </form>
              <form action={cancelWorkoutSessionAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100">
                  Cancel Session
                </button>
              </form>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
