import Link from "next/link";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppNavigation } from "@/components/app-navigation";
import { SignOutButton } from "@/components/signout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";
import { isAdminIdentity } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { ensureExerciseLibrarySeeded } from "@/lib/exercise-seed";
import { normalizeThemeOverrides, themeOverridesToCss } from "@/lib/theme";
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
  const db = getDb();
  const pref = await db
    .select({
      themeOverrides: userPreferences.themeOverrides,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  const themeOverrideCss = themeOverridesToCss(normalizeThemeOverrides(pref?.themeOverrides));

  await trackUserIp(session.user.id, await headers());
  await ensureExerciseLibrarySeeded();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {themeOverrideCss ? <style>{themeOverrideCss}</style> : null}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 rounded-3xl border border-line bg-surface/50 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link 
              href="/dashboard" 
              className="text-xl font-black uppercase tracking-tighter text-foreground hover:text-accent-pink transition-colors"
            >
              GYM-MICRO
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden h-4 w-px bg-line sm:block" />
              <span className="hidden text-xs font-medium text-muted sm:inline">
                {session.user.name ?? session.user.email ?? "Signed in"}
              </span>
              <SignOutButton />
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <AppNavigation isAdmin={isAdmin} />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
