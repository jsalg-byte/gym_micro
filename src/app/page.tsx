import Link from "next/link";

export default function Home() {
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
          This MVP runs as a single Next.js app with PostgreSQL, Auth.js (credentials + OAuth), Redis,
          and S3-compatible storage, designed for Git deployments in Coolify.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create account
          </Link>
          <Link
            href="/signin"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100"
          >
            Open dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
