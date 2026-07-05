import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import {
  exerciseGifOverrides,
  exercises,
  routineDayExercises,
  routineDays,
  routines,
  userPreferences,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import {
  getExerciseDemoReview,
  resolveExerciseDemoPlayback,
  type ExerciseDemoReview,
} from "@/lib/exercise-gifs";
import { requireUserId } from "@/lib/session";
import { formatEasternDateTime } from "@/lib/timezone";
import { normalizeWeightUnit } from "@/lib/weight-unit";
import {
  cancelWorkoutSessionAction,
  completeWorkoutSessionAction,
  deleteWorkoutSetAction,
  updateWorkoutSetAction,
} from "@/server/actions";
import { RestTimer } from "@/components/rest-timer";
import { SessionSetLogger } from "@/components/session-set-logger";
import { LoggedSetGroups } from "@/components/logged-set-groups";
import { DeleteSessionButton } from "@/components/delete-session-button";
import { FlyoverSelect } from "@/components/flyover-select";
import { WorkoutJsonExport } from "@/components/workout-json-export";

type DemoSourceOverride = {
  gifUrl: string;
  sourceExerciseId: string | null;
  sourceName: string | null;
};

function parseDemoSourceMeta(sourceName: string | null) {
  if (!sourceName) {
    return null;
  }

  try {
    return JSON.parse(sourceName) as {
      start?: string;
      duration?: number;
    };
  } catch {
    return null;
  }
}

function slugifyDemoName(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function getFallbackExerciseDemo(exerciseName: string): ExerciseDemoReview {
  return {
    media: {
      name: exerciseName,
      slug: slugifyDemoName(exerciseName),
      status: "pending",
      mediaType: "video",
      localPath: null,
      storage: null,
      source: null,
      sourceUrl: null,
    },
    seed: null,
    queries: [],
  };
}

function applyDemoSourceOverride(
  demo: ExerciseDemoReview,
  exerciseName: string,
  override?: DemoSourceOverride,
): ExerciseDemoReview {
  if (!override) {
    return demo;
  }

  const meta = parseDemoSourceMeta(override.sourceName);
  return {
    ...demo,
    seed: {
      ...(demo.seed ?? {
        name: exerciseName,
        slug: override.sourceExerciseId ?? demo.media.slug,
      }),
      youtubeUrl: override.gifUrl,
      approved: true,
      start: meta?.start,
      duration: meta?.duration,
      mediaType: "video",
    },
  };
}

async function resolveSessionExerciseDemo(
  exercise: {
    id: string;
    name: string;
  },
  override?: DemoSourceOverride,
) {
  try {
    const pendingDemo = applyDemoSourceOverride(
      getExerciseDemoReview(exercise.name),
      exercise.name,
      override,
    );
    return await resolveExerciseDemoPlayback(pendingDemo);
  } catch (error) {
    console.warn("Could not resolve session exercise demo:", {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      error,
    });
    return getFallbackExerciseDemo(exercise.name);
  }
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const { edit } = await searchParams;
  const editMode = edit === "1";
  const db = getDb();

  const [session] = await db
    .select({
      id: workoutSessions.id,
      status: workoutSessions.status,
      routineDayId: workoutSessions.routineDayId,
      routineName: routines.name,
      dayName: routineDays.dayName,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
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
            category: exercises.category,
            muscleGroup: exercises.muscleGroup,
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
            category: exercises.category,
            muscleGroup: exercises.muscleGroup,
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
            and(eq(workoutSessions.userId, userId), inArray(workoutSets.exerciseId, exerciseIds)),
          )
          .orderBy(desc(workoutSets.createdAt))
      : [];
  const demoSourceOverrides =
    exerciseIds.length > 0
      ? await db
          .select({
            exerciseId: exerciseGifOverrides.exerciseId,
            gifUrl: exerciseGifOverrides.gifUrl,
            sourceExerciseId: exerciseGifOverrides.sourceExerciseId,
            sourceName: exerciseGifOverrides.sourceName,
          })
          .from(exerciseGifOverrides)
          .where(
            and(
              eq(exerciseGifOverrides.userId, userId),
              inArray(exerciseGifOverrides.exerciseId, exerciseIds),
            ),
          )
      : [];

  const demoSourceOverrideByExerciseId = new Map(
    demoSourceOverrides.map((override) => [override.exerciseId, override]),
  );

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

  const exerciseOptions = await Promise.all(
    dayPlannedExercises.map(async (exercise) => {
      const recent = recentByExercise.get(exercise.id);
      const demo = await resolveSessionExerciseDemo(
        exercise,
        demoSourceOverrideByExerciseId.get(exercise.id),
      );
      return {
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        muscleGroup: exercise.muscleGroup,
        gifUrl: demo.media.localPath,
        demo,
        prefillReps: recent?.reps ?? exercise.targetReps ?? null,
        prefillWeight:
          recent?.weight ?? (exercise.targetWeight !== null ? String(exercise.targetWeight) : null),
      };
    }),
  );

  const exerciseNameById = new Map<string, string>();
  for (const exercise of dayPlannedExercises) {
    exerciseNameById.set(exercise.id, exercise.name);
  }
  for (const set of sets) {
    if (!exerciseNameById.has(set.exerciseId)) {
      exerciseNameById.set(set.exerciseId, set.exerciseName ?? "Exercise");
    }
  }
  const setExerciseOptions = Array.from(exerciseNameById.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const initialExerciseId = sets[sets.length - 1]?.exerciseId ?? exerciseOptions[0]?.id ?? "";

  const groupedSets = new Map<
    string,
    {
      exerciseName: string;
      sets: typeof sets;
    }
  >();
  for (const set of sets) {
    const key = set.exerciseId;
    const group = groupedSets.get(key);
    if (!group) {
      groupedSets.set(key, {
        exerciseName: set.exerciseName ?? "Exercise",
        sets: [set],
      });
      continue;
    }
    group.sets.push(set);
  }
  const groupedSetList = Array.from(groupedSets.entries()).map(([exerciseId, group]) => ({
    exerciseId,
    exerciseName: group.exerciseName,
    sets: group.sets,
  }));

  const workoutTitle = `${session.routineName ?? "Workout Plan"} / ${session.dayName ?? "Session"}`;
  const workoutJsonExport =
    session.status === "completed"
      ? JSON.stringify(
          {
            type: "gym_micro_workout",
            version: 1,
            exportedAt: new Date().toISOString(),
            session: {
              id: session.id,
              title: workoutTitle,
              routineName: session.routineName,
              dayName: session.dayName,
              status: session.status,
              startedAt: session.startedAt.toISOString(),
              endedAt: session.endedAt?.toISOString() ?? null,
              durationMinutes: session.endedAt
                ? Math.max(
                    0,
                    Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000),
                  )
                : null,
              weightUnit,
            },
            summary: {
              exerciseCount: groupedSetList.length,
              setCount: sets.length,
            },
            exercises: groupedSetList.map((group) => ({
              id: group.exerciseId,
              name: group.exerciseName,
              sets: group.sets.map((set, index) => ({
                setNumber: index + 1,
                overallSetOrder: set.setOrder,
                reps: set.reps,
                weight: set.weight !== null ? Number(set.weight) : null,
                weightUnit,
                isWarmup: set.isWarmup,
              })),
            })),
          },
          null,
          2,
        )
      : null;

  const canEditLoggedSets = editMode;
  const showEditToggle = sets.length > 0;

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Session: {session.routineName ?? "Workout Plan"} / {session.dayName ?? "Day"}
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Started {formatEasternDateTime(session.startedAt)} · Status {session.status}
            </p>
          </div>
          <Link
            href="/sessions"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to sessions
          </Link>
        </div>
        {session.status === "completed" ? (
          <div className="mt-2">
            <Link
              href={`/share/session/${session.id}`}
              className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900 hover:bg-cyan-100"
            >
              Share Workout
            </Link>
          </div>
        ) : null}
      </section>

      {workoutJsonExport ? <WorkoutJsonExport exportText={workoutJsonExport} /> : null}

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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-slate-900">Logged Sets</h2>
            {showEditToggle ? (
              <Link
                href={
                  canEditLoggedSets
                    ? `/sessions/${session.id}`
                    : `/sessions/${session.id}?edit=1`
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {canEditLoggedSets ? "Done Editing" : "Edit"}
              </Link>
            ) : null}
          </div>
          <div className="mt-3 space-y-3">
            {canEditLoggedSets ? (
              Array.from(groupedSets.entries()).map(([exerciseId, group]) => (
                <section key={exerciseId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{group.exerciseName}</p>
                    <span className="rounded-full border border-cyan-300 bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-900">
                      {group.sets.length} set{group.sets.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {group.sets.map((set, index) => (
                      <li key={set.id} className="rounded-md border border-slate-200 bg-white p-2 text-sm">
                        <p className="font-semibold text-slate-900">
                          Set {index + 1} (overall #{set.setOrder})
                        </p>
                        <form action={updateWorkoutSetAction} className="mt-2 grid gap-2 sm:grid-cols-5">
                          <input type="hidden" name="setId" value={set.id} />
                          <div className="text-xs text-slate-600">
                            <span>Exercise</span>
                            <FlyoverSelect
                              name="exerciseId"
                              defaultValue={set.exerciseId}
                              label="Exercise"
                              panelTitle="Move set to exercise"
                              options={setExerciseOptions.map((exercise) => ({
                                value: exercise.id,
                                label: exercise.name,
                              }))}
                              required
                              searchable
                              className="mt-1"
                              triggerClassName="rounded-lg px-2 py-1.5 text-sm"
                            />
                          </div>
                          <label className="text-xs text-slate-600">
                            Reps
                            <input
                              type="number"
                              name="reps"
                              min={1}
                              max={100}
                              required
                              defaultValue={set.reps}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                            />
                          </label>
                          <label className="text-xs text-slate-600">
                            Weight ({weightUnit})
                            <input
                              type="number"
                              name="weight"
                              min={0}
                              step="0.5"
                              defaultValue={set.weight !== null ? String(set.weight) : ""}
                              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-600 sm:mt-6">
                            <input type="checkbox" name="isWarmup" defaultChecked={set.isWarmup} />
                            Warmup
                          </label>
                          <div className="flex items-center gap-2 sm:mt-5">
                            <button className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                              Save
                            </button>
                          </div>
                        </form>
                        <form action={deleteWorkoutSetAction} className="mt-2">
                          <input type="hidden" name="setId" value={set.id} />
                          <button className="rounded-md border border-rose-300 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                            Delete Set
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <LoggedSetGroups sessionId={session.id} weightUnit={weightUnit} groups={groupedSetList} />
            )}
          </div>
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
          ) : (
            <div className="mt-3">
              <DeleteSessionButton
                sessionId={session.id}
                buttonLabel="Delete Session"
                buttonClassName="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
              />
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
