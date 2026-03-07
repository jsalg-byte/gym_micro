import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/signout-button";
import { authOptions } from "@/lib/auth";
import { ensureExerciseLibrarySeeded } from "@/lib/exercise-seed";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  await ensureExerciseLibrarySeeded();

  return (
    <div className="shell min-h-screen py-4">
      <header className="panel mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm font-black uppercase tracking-wider text-slate-900">
            Gym-Micro
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <Link href="/routines" className="rounded-md px-2 py-1 hover:bg-slate-100">
              Routines
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
            <Link href="/progress" className="rounded-md px-2 py-1 hover:bg-slate-100">
              Progress
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
