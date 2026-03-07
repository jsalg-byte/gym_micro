import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises, foods, routines, workoutSessions } from "@/db/schema";
import { requireUserId } from "@/lib/session";

async function getDashboardStats(userId: string) {
  const db = getDb();
  const routineCount = await db.$count(routines, eq(routines.userId, userId));
  const sessionCount = await db.$count(workoutSessions, eq(workoutSessions.userId, userId));
  const exerciseCount = await db.$count(exercises);
  const foodCount = await db.$count(foods);

  return {
    routines: routineCount,
    sessions: sessionCount,
    exercises: exerciseCount,
    foods: foodCount,
  };
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const stats = await getDashboardStats(userId);

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Core MVP modules are active: username auth, routines by day, sessions, nutrition with barcode autofill,
          Redis, and progress photos.
        </p>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Routines</p>
          <p className="text-2xl font-black text-slate-900">{stats.routines}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sessions</p>
          <p className="text-2xl font-black text-slate-900">{stats.sessions}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Exercises</p>
          <p className="text-2xl font-black text-slate-900">{stats.exercises}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Foods</p>
          <p className="text-2xl font-black text-slate-900">{stats.foods}</p>
        </article>
      </section>
    </main>
  );
}
