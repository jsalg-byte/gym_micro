import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { routineDays, routines, userPreferences, workoutSessions } from "@/db/schema";
import { DeleteSessionButton } from "@/components/delete-session-button";
import { FlyoverSelect } from "@/components/flyover-select";
import { requireUserId } from "@/lib/session";
import { formatEasternDateTime } from "@/lib/timezone";
import {
  setActiveRoutineAction,
  startWorkoutSessionAction,
} from "@/server/actions";

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
          <h1 className="text-xl font-black text-foreground">Sessions</h1>
          <p className="mt-1 text-sm text-muted">
            Sessions are started from your active workout plan. Pick a plan day and the session auto-links to it.
          </p>
        </article>

        <article className="panel p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-muted">Active Workout Plan</h2>
          {userRoutines.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No workout plans yet. Create one in{" "}
              <Link href="/routines" className="font-semibold text-accent-cyan hover:text-accent-cyan/80">
                workout plans
              </Link>
              .
            </p>
          ) : (
            <>
              <form action={setActiveRoutineAction} className="mt-2 flex gap-2">
                <FlyoverSelect
                  name="routineId"
                  defaultValue={activeRoutine?.id ?? userRoutines[0].id}
                  label="Workout plan"
                  panelTitle="Choose active plan"
                  options={userRoutines.map((routine) => ({
                    value: routine.id,
                    label: routine.name,
                  }))}
                  required
                  className="flex-1"
                  triggerClassName="rounded-lg py-2"
                />
                <button className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-soft">
                  Save
                </button>
              </form>
              <p className="mt-2 text-xs text-muted">
                Current: {activeRoutine?.name ?? "Not selected yet"}
              </p>
            </>
          )}
        </article>

        <article className="panel p-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-muted">Start Session</h2>
          {!activeRoutine ? (
            <p className="mt-2 text-sm text-muted">Set an active workout plan first.</p>
          ) : activeRoutineDays.length === 0 ? (
            <p className="mt-2 text-sm text-muted">This workout plan has no days yet. Add days in workout plans.</p>
          ) : (
            <form action={startWorkoutSessionAction} className="mt-2 space-y-2">
              <FlyoverSelect
                name="routineDayId"
                label="Routine day"
                panelTitle="Start which day?"
                required
                options={activeRoutineDays.map((day) => ({
                  value: day.id,
                  label: day.dayName,
                }))}
                triggerClassName="rounded-lg py-2"
              />
              <details className="mt-1">
                <summary className="inline cursor-pointer list-none text-xs font-semibold text-accent-cyan underline underline-offset-2 hover:text-accent-cyan/80">
                  Forgot to log session?
                </summary>
                <div className="mt-2 rounded-lg border border-line bg-background p-2">
                  <label className="block text-xs text-muted">
                    Session date
                    <input
                      type="date"
                      name="startedAtDate"
                      className="mt-1 w-full rounded-md border border-line bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-muted"
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-muted">
                    Leave blank to start now.
                  </p>
                </div>
              </details>
              <button className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/85">
                Create Session
              </button>
            </form>
          )}
        </article>
      </section>

      <section className="panel p-4">
        <h2 className="text-xl font-black text-foreground">Recent Sessions</h2>
        <ul className="mt-3 space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-line bg-background p-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {session.routineName ?? "Workout Plan"} - {session.dayName ?? "Day"}
                </p>
                <p className="text-xs text-muted">
                  {formatEasternDateTime(session.startedAt)} · {session.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/sessions/${session.id}`}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-soft"
                >
                  Open
                </Link>
                {session.status === "completed" ? (
                  <Link
                    href={`/share/session/${session.id}`}
                    className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/15"
                  >
                    Share
                  </Link>
                ) : null}
                <DeleteSessionButton sessionId={session.id} buttonLabel="Delete" />
              </div>
            </li>
          ))}
          {sessions.length === 0 ? <li className="text-sm text-muted">No sessions yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
