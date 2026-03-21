import Link from "next/link";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { SignOutButton } from "@/components/signout-button";
import { ThemeToggle } from "@/components/theme-toggle";
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm font-black uppercase tracking-wider text-slate-900">
            Gym-Micro
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-xs text-slate-500 sm:inline">{session.user.name ?? "Signed in"}</span>
            <SignOutButton />
          </div>
        </div>
        <AppNavigation isAdmin={isAdmin} />
      </header>
      {children}
    </div>
  );
}
