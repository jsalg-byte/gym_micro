import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db/client";
import { workoutSessions } from "@/db/schema";
import { requireUserId } from "@/lib/session";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const db = getDb();
  const [activeSession] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "active")))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-line bg-surface/50 p-6 backdrop-blur-sm transition-colors">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-muted">Quick start your next workout session.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:max-w-sm">
        <Link
          href={activeSession ? `/sessions/${activeSession.id}` : "/sessions"}
          className="group block rounded-3xl border border-line bg-surface p-8 text-center transition-all hover:border-accent-pink hover:shadow-[0_0_30px_rgba(255,92,92,0.1)] active:scale-[0.98]"
        >
          <p className="text-xs font-black uppercase tracking-widest text-muted group-hover:text-accent-pink transition-colors">Workout</p>
          <p className="mt-2 text-2xl font-black text-foreground">
            {activeSession ? "Open Session" : "Start Workout"}
          </p>
          <p className="mt-2 text-sm font-medium text-muted">
            {activeSession ? "Resume logging your active workout." : "Go to Sessions and begin logging."}
          </p>
        </Link>
      </section>
    </main>
  );
}
