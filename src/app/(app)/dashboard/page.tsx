import Link from "next/link";
import { requireUserId } from "@/lib/session";

export default async function DashboardPage() {
  await requireUserId();

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Quick start your next workout session.</p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:max-w-sm">
        <Link
          href="/sessions"
          className="panel block p-5 text-center transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Workout</p>
          <p className="mt-1 text-2xl font-black text-slate-900">Start Workout</p>
          <p className="mt-2 text-sm text-slate-600">Go to Sessions and begin logging.</p>
        </Link>
      </section>
    </main>
  );
}
