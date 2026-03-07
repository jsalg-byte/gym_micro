import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user?.id);

  return (
    <div className="shell min-h-screen py-8">
      <main className="panel space-y-6 p-6">
        <p className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">
          Gym-Micro MVP
        </p>
        <h1 className="text-4xl font-black leading-tight text-slate-900">
          Session tracking + meal logging with routine days, barcode macros, and progress photos.
        </h1>
        <p className="max-w-2xl text-slate-600">
          Gym-Micro helps you track workouts, nutrition, and progress photos in one place, so you can stay
          consistent and see your results over time.
        </p>
        <div className="flex flex-wrap gap-3">
          {!isLoggedIn ? (
            <Link
              href="/signup"
              className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100"
            >
              Create account
            </Link>
          ) : null}
          <Link
            href="/signin"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Sign in
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100"
            >
              Open dashboard
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}
