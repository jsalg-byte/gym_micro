import Link from "next/link";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/signout-button";
import { isAdminIdentity } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { ensureExerciseLibrarySeeded } from "@/lib/exercise-seed";
import { trackUserIp } from "@/lib/user-ip";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const isAdmin = await isAdminIdentity({
    userId: session.user.id,
    sessionEmail: session.user.email,
  });

  await trackUserIp(session.user.id, await headers());
  await ensureExerciseLibrarySeeded();

  return (
    <div className="shell min-h-screen py-4">
      <header className="panel mb-4 space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-black uppercase tracking-wider text-slate-900">
              Gym-Micro
            </Link>
            <nav className="hidden items-center gap-2 text-sm text-slate-700 md:flex">
              <Link href="/routines" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Workout Plans
              </Link>
              <Link href="/exercises" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Exercise Library
              </Link>
              <Link href="/sessions" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Sessions
              </Link>
              <Link href="/nutrition" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Nutrition
              </Link>
              <Link href="/fasting" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Fasting
              </Link>
              <Link href="/progress" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Progress
              </Link>
              <Link href="/friends" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Friends
              </Link>
              <Link href="/settings" className="rounded-md px-2 py-1 hover:bg-slate-100">
                Settings
              </Link>
              {isAdmin ? (
                <Link href="/admin" className="rounded-md px-2 py-1 hover:bg-slate-100">
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:inline">{session.user.name ?? "Signed in"}</span>
            <SignOutButton />
          </div>
        </div>

        <details className="md:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            Menu
          </summary>
          <nav className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
            <Link href="/routines" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Workout Plans
            </Link>
            <Link href="/exercises" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Exercise Library
            </Link>
            <Link href="/sessions" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Sessions
            </Link>
            <Link href="/nutrition" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Nutrition
            </Link>
            <Link href="/fasting" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Fasting
            </Link>
            <Link href="/progress" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Progress
            </Link>
            <Link href="/friends" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Friends
            </Link>
            <Link href="/settings" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
              Settings
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center hover:bg-slate-50">
                Admin
              </Link>
            ) : null}
          </nav>
        </details>
      </header>
      {children}
    </div>
  );
}
