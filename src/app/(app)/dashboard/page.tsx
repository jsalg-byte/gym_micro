import Link from "next/link";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises, foods, routines, workoutSessions } from "@/db/schema";
import { isAdminIdentity } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
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
  const session = await getServerSession(authOptions);
  const stats = await getDashboardStats(userId);
  const isAdmin = await isAdminIdentity({
    userId,
    sessionEmail: session?.user?.email ?? null,
  });

  const cards = [
    {
      title: "Workout Plans",
      href: "/routines",
      description: "Create and organize plan days with exercises.",
      value: `${stats.routines}`,
      valueLabel: "plans",
    },
    {
      title: "Exercise Library",
      href: "/exercises",
      description: "Manage your exercise list and defaults.",
      value: `${stats.exercises}`,
      valueLabel: "exercises",
    },
    {
      title: "Sessions",
      href: "/sessions",
      description: "Start workouts and log sets quickly.",
      value: `${stats.sessions}`,
      valueLabel: "sessions",
    },
    {
      title: "Nutrition",
      href: "/nutrition",
      description: "Scan, log foods, and track macros.",
      value: `${stats.foods}`,
      valueLabel: "foods",
    },
    {
      title: "Fasting",
      href: "/fasting",
      description: "Run your fasting timer and view log calendar.",
      value: "Timer",
      valueLabel: "enabled",
    },
    {
      title: "Progress",
      href: "/progress",
      description: "Track photos and workout progress timeline.",
      value: "Calendar",
      valueLabel: "view",
    },
    {
      title: "Friends",
      href: "/friends",
      description: "Share workout activity with accepted friends.",
      value: "Social",
      valueLabel: "activity",
    },
    {
      title: "Settings",
      href: "/settings",
      description: "Adjust preferences like weight units.",
      value: "Profile",
      valueLabel: "settings",
    },
  ];

  if (isAdmin) {
    cards.push({
      title: "Admin",
      href: "/admin",
      description: "Manage users and associated IP logs.",
      value: "Admin",
      valueLabel: "tools",
    });
  }

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose a section to jump straight into logging workouts, nutrition, progress, and more.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="panel block p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.title}</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {card.value} <span className="text-sm font-semibold text-slate-500">{card.valueLabel}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
