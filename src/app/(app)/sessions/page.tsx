import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { routineDays, routines, userPreferences, workoutSessions } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { setActiveRoutineAction, startWorkoutSessionAction } from "@/server/actions";

export default async function SessionsPage() {
  const userId = await requireUserId();
  const db = getDb();

  const [userRoutines, pref, sessions] = await Promise.all([
    db.select().from(routines).where(eq(routines.userId, userId)).orderBy(desc(routines.createdAt)),
    db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: workoutSessions.id,
        status: workoutSessions.status,
        startedAt: workoutSessions.startedAt,
        routineName: routines.name,
        dayName: routineDays.dayName,
      })
      .from(workoutSessions)
      .leftJoin(routines, eq(workoutSessions.routineId, routines.id))
      .leftJoin(routineDays, eq(workoutSessions.routineDayId, routineDays.id))
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startedAt)),
  ]);

  const activeRoutine = userRoutines.find((routine) => routine.id === pref?.activeRoutineId) ?? null;
  const activeRoutineDays = activeRoutine
    ? await db
        .select()
        .from(routineDays)
        .where(eq(routineDays.routineId, activeRoutine.id))
        .orderBy(asc(routineDays.sortOrder))
    : [];

  return (
    <main className="grid gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
      <section className="space-y-4">
        <article className="panel p-4">
          <h1 className="text-xl font-black text-slate-900">Sessions</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sessions are started from your active routine. Select the day and the app will auto-link that plan.
          </p>
        </article>

        <article className="panel p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Active Routine</h2>
          {userRoutines.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No routines yet. Create one in{" "}
              <Link href="/routines" className="font-semibold text-teal-700 hover:text-teal-800">
                routines
              </Link>
              .
            </p>
          ) : (
            <>
              <form action={setActiveRoutineAction} className="mt-2 flex gap-2">
                <select
                  name="routineId"
                  defaultValue={activeRoutine?.id ?? userRoutines[0].id}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  {userRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  Save
                </button>
              </form>
              <p className="mt-2 text-xs text-slate-500">
                Current: {activeRoutine?.name ?? "Not selected yet"}
              </p>
            </>
          )}
        </article>

        <article className="panel p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Start Session</h2>
          {!activeRoutine ? (
            <p className="mt-2 text-sm text-slate-600">Set an active routine first.</p>
          ) : activeRoutineDays.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">This routine has no days yet. Add days in routines.</p>
          ) : (
            <form action={startWorkoutSessionAction} className="mt-2 space-y-2">
              <select
                name="routineDayId"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                {activeRoutineDays.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.dayName}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                Start Session
              </button>
            </form>
          )}
        </article>
      </section>

      <section className="panel p-4">
        <h2 className="text-xl font-black text-slate-900">Recent Sessions</h2>
        <ul className="mt-3 space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {session.routineName ?? "Routine"} - {session.dayName ?? "Day"}
                </p>
                <p className="text-xs text-slate-600">
                  {new Date(session.startedAt).toLocaleString()} · {session.status}
                </p>
              </div>
              <Link
                href={`/sessions/${session.id}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Open
              </Link>
            </li>
          ))}
          {sessions.length === 0 ? <li className="text-sm text-slate-500">No sessions yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
