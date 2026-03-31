import Link from "next/link";
import { and, eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { exercises, friendRequests, routineDays, routines, userPreferences, workoutSessions, workoutSets } from "@/db/schema";
import { WorkoutShareActions } from "@/components/workout-share-actions";
import { requireUserId } from "@/lib/session";
import { formatEasternDateTime } from "@/lib/timezone";
import { normalizeWeightUnit, weightUnitLabel } from "@/lib/weight-unit";

export default async function ShareSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const db = getDb();

  const [session] = await db
    .select({
      id: workoutSessions.id,
      ownerUserId: workoutSessions.userId,
      status: workoutSessions.status,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
      routineName: routines.name,
      dayName: routineDays.dayName,
    })
    .from(workoutSessions)
    .leftJoin(routines, eq(workoutSessions.routineId, routines.id))
    .leftJoin(routineDays, eq(workoutSessions.routineDayId, routineDays.id))
    .where(eq(workoutSessions.id, id))
    .limit(1);

  if (!session) {
    notFound();
  }

  if (session.ownerUserId !== userId) {
    const [friendAccess] = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.status, "accepted"),
          or(
            and(eq(friendRequests.requesterId, userId), eq(friendRequests.addresseeId, session.ownerUserId)),
            and(eq(friendRequests.requesterId, session.ownerUserId), eq(friendRequests.addresseeId, userId)),
          ),
        ),
      )
      .limit(1);

    if (!friendAccess) {
      notFound();
    }
  }

  const pref = await db
    .select({
      weightUnit: userPreferences.weightUnit,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.ownerUserId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  const weightUnit = normalizeWeightUnit(pref?.weightUnit);

  const sets = await db
    .select({
      id: workoutSets.id,
      setOrder: workoutSets.setOrder,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
      isWarmup: workoutSets.isWarmup,
      exerciseId: workoutSets.exerciseId,
      exerciseName: exercises.name,
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.sessionId, session.id))
    .orderBy(workoutSets.setOrder);

  const grouped = new Map<
    string,
    {
      exerciseName: string;
      sets: typeof sets;
    }
  >();

  for (const set of sets) {
    const group = grouped.get(set.exerciseId);
    if (!group) {
      grouped.set(set.exerciseId, {
        exerciseName: set.exerciseName,
        sets: [set],
      });
      continue;
    }
    group.sets.push(set);
  }

  const groups = Array.from(grouped.values());
  const totalSets = sets.length;
  const compactMode = groups.length >= 7 || totalSets >= 24;
  const title = `${session.routineName ?? "Workout Plan"} / ${session.dayName ?? "Session"}`;

  return (
    <main className="h-dvh w-screen overflow-hidden bg-slate-100 p-3 text-slate-900">
      <div className="mx-auto flex h-full w-full max-w-[460px] flex-col gap-2">
        <WorkoutShareActions title={title} />

        <section className="panel flex-1 overflow-hidden p-3">
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Workout Share</p>
                <h1 className="truncate text-lg font-black text-slate-900">{title}</h1>
                <p className="text-[11px] text-slate-600">
                  {formatEasternDateTime(session.startedAt)} {session.endedAt ? `→ ${formatEasternDateTime(session.endedAt)}` : ""}
                </p>
              </div>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {session.status}
              </span>
            </div>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
              {groups.length} exercise{groups.length === 1 ? "" : "s"} · {totalSets} set{totalSets === 1 ? "" : "s"} · unit{" "}
              {weightUnitLabel(weightUnit)}
            </div>

            <div className={`mt-2 flex-1 overflow-hidden ${compactMode ? "text-[10px]" : "text-[11px]"}`}>
              <ul className={`h-full ${compactMode ? "grid grid-cols-1 gap-1" : "space-y-2"}`}>
                {groups.map((group) => (
                  <li key={group.exerciseName} className="rounded-md border border-slate-200 bg-white px-2 py-1">
                    <p className="font-bold text-slate-900">{group.exerciseName}</p>
                    <p className="mt-0.5 text-slate-700">
                      {group.sets.map((set) => (
                        <span key={set.id} className="mr-1 inline-block">
                          #{set.setOrder} {set.reps}r{set.weight ? ` @ ${set.weight}${weightUnitLabel(weightUnit)}` : ""}{" "}
                          {set.isWarmup ? "(W)" : ""}
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">Screenshot this card to share on social media.</p>
              <Link
                href={`/sessions/${session.id}`}
                className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
