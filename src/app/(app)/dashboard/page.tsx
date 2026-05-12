import Link from "next/link";
import { requireUserId } from "@/lib/session";

export default async function DashboardPage() {
  await requireUserId();

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-line bg-surface/50 p-6 backdrop-blur-sm transition-colors">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm font-medium text-muted">Quick start your next workout session.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:max-w-sm">
        <Link
          href="/sessions"
          className="group block rounded-3xl border border-line bg-surface p-8 text-center transition-all hover:border-accent-pink hover:shadow-[0_0_30px_rgba(255,92,92,0.1)] active:scale-[0.98]"
        >
          <p className="text-xs font-black uppercase tracking-widest text-muted group-hover:text-accent-pink transition-colors">Workout</p>
          <p className="mt-2 text-2xl font-black text-foreground">Start Workout</p>
          <p className="mt-2 text-sm font-medium text-muted">Go to Sessions and begin logging.</p>
        </Link>
      </section>
    </main>
  );
}
