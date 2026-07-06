import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { exercises, routineDays, routines, userPreferences, workoutSessions, workoutSets } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { normalizeWeightUnit, weightUnitLabel, type WeightUnit } from "@/lib/weight-unit";

const KG_TO_LBS = 2.2046226218;

type LiftComparison = {
  label: string;
  pluralLabel: string;
  article: "a" | "an";
  emoji: string;
  averageKg: number;
  accent: string;
};

const LIFT_COMPARISONS: LiftComparison[] = [
  {
    label: "House Cat",
    pluralLabel: "house cats",
    article: "a",
    emoji: "🐈",
    averageKg: 4.5,
    accent: "from-amber-100 via-orange-100 to-emerald-100",
  },
  {
    label: "Bicycle",
    pluralLabel: "bicycles",
    article: "a",
    emoji: "🚲",
    averageKg: 11,
    accent: "from-cyan-100 via-sky-100 to-emerald-100",
  },
  {
    label: "Golden Retriever",
    pluralLabel: "golden retrievers",
    article: "a",
    emoji: "🐕",
    averageKg: 32,
    accent: "from-yellow-100 via-amber-100 to-lime-100",
  },
  {
    label: "Washing Machine",
    pluralLabel: "washing machines",
    article: "a",
    emoji: "🧺",
    averageKg: 70,
    accent: "from-slate-100 via-cyan-100 to-blue-100",
  },
  {
    label: "Black Bear",
    pluralLabel: "black bears",
    article: "a",
    emoji: "🐻",
    averageKg: 135,
    accent: "from-stone-200 via-amber-100 to-emerald-100",
  },
  {
    label: "Motorcycle",
    pluralLabel: "motorcycles",
    article: "a",
    emoji: "🏍️",
    averageKg: 200,
    accent: "from-red-100 via-orange-100 to-slate-100",
  },
  {
    label: "Lion",
    pluralLabel: "lions",
    article: "a",
    emoji: "🦁",
    averageKg: 420,
    accent: "from-emerald-100 via-lime-100 to-amber-100",
  },
  {
    label: "Grand Piano",
    pluralLabel: "grand pianos",
    article: "a",
    emoji: "🎹",
    averageKg: 480,
    accent: "from-violet-100 via-slate-100 to-cyan-100",
  },
  {
    label: "Compact Car",
    pluralLabel: "compact cars",
    article: "a",
    emoji: "🚗",
    averageKg: 1_300,
    accent: "from-sky-100 via-blue-100 to-indigo-100",
  },
  {
    label: "Pickup Truck",
    pluralLabel: "pickup trucks",
    article: "a",
    emoji: "🛻",
    averageKg: 2_000,
    accent: "from-orange-100 via-amber-100 to-stone-100",
  },
  {
    label: "Elephant",
    pluralLabel: "elephants",
    article: "an",
    emoji: "🐘",
    averageKg: 5_400,
    accent: "from-slate-200 via-cyan-100 to-emerald-100",
  },
  {
    label: "Fire Truck",
    pluralLabel: "fire trucks",
    article: "a",
    emoji: "🚒",
    averageKg: 16_000,
    accent: "from-red-100 via-orange-100 to-yellow-100",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function getComparisonAverage(item: LiftComparison, unit: WeightUnit) {
  return unit === "kg" ? item.averageKg : item.averageKg * KG_TO_LBS;
}

function getLiftComparison(totalLifted: number, unit: WeightUnit) {
  const totalLiftedKg = unit === "kg" ? totalLifted : totalLifted / KG_TO_LBS;
  return [...LIFT_COMPARISONS]
    .reverse()
    .find((item) => totalLiftedKg >= item.averageKg) ?? LIFT_COMPARISONS[0];
}

function formatEquivalentCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 10 ? 1 : 2,
  }).format(value);
}

function ComparisonIllustration({ item }: { item: LiftComparison }) {
  return (
    <div
      role="img"
      aria-label={`${item.label} illustration`}
      className={`relative mx-auto flex aspect-[1.45] w-full max-w-[320px] items-center justify-center overflow-hidden rounded-[2.25rem] bg-gradient-to-br ${item.accent}`}
    >
      <div className="absolute -left-7 bottom-8 h-28 w-28 rounded-full bg-emerald-300/60" />
      <div className="absolute left-12 top-7 h-36 w-36 rounded-full bg-white/40" />
      <div className="absolute -right-6 bottom-4 h-40 w-40 rounded-full bg-emerald-500/25" />
      <div className="absolute inset-x-10 bottom-8 h-10 rounded-full bg-slate-950/10 blur-md" />
      <span className="relative drop-shadow-sm text-[8rem] leading-none sm:text-[9rem]">{item.emoji}</span>
    </div>
  );
}

export default async function WorkoutCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const db = getDb();

  const [session] = await db
    .select({
      id: workoutSessions.id,
      status: workoutSessions.status,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
      routineName: routines.name,
      dayName: routineDays.dayName,
    })
    .from(workoutSessions)
    .leftJoin(routines, eq(workoutSessions.routineId, routines.id))
    .leftJoin(routineDays, eq(workoutSessions.routineDayId, routineDays.id))
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)))
    .limit(1);

  if (!session || session.status !== "completed" || !session.endedAt) {
    notFound();
  }

  const [sets, prefs] = await Promise.all([
    db
      .select({
        reps: workoutSets.reps,
        weight: workoutSets.weight,
        exerciseName: exercises.name,
      })
      .from(workoutSets)
      .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .where(eq(workoutSets.sessionId, session.id)),
    db
      .select({ weightUnit: userPreferences.weightUnit })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const weightUnit = normalizeWeightUnit(prefs?.weightUnit);
  const totalLifted = sets.reduce((total, set) => {
    const weight = set.weight === null ? 0 : Number(set.weight);
    return total + weight * set.reps;
  }, 0);
  const durationMinutes = Math.max(
    0,
    Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000),
  );
  const comparison = getLiftComparison(totalLifted, weightUnit);
  const comparisonAverage = getComparisonAverage(comparison, weightUnit);
  const equivalentCount = comparisonAverage > 0 ? totalLifted / comparisonAverage : 0;
  const title = `${session.routineName ?? "Workout Plan"} / ${session.dayName ?? "Session"}`;

  return (
    <main className="min-h-dvh bg-white px-5 py-6 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col">
        <div className="flex justify-end">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            Completed
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center pb-6 text-center">
          <ComparisonIllustration item={comparison} />

          <div className="mt-8 space-y-3">
            <p className="text-2xl font-black tracking-tight text-slate-950">Congratulations!</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              You lifted {comparison.article} <span className="text-violet-600">{comparison.label}</span>
            </h1>
            <p className="mx-auto max-w-sm text-base leading-7 text-slate-500">
              You lifted {formatNumber(totalLifted)} {weightUnitLabel(weightUnit)} during this workout — about {formatEquivalentCount(equivalentCount)} {comparison.pluralLabel}. {comparison.article === "an" ? "An" : "A"} {comparison.label.toLowerCase()} weighs {formatNumber(comparisonAverage)} {weightUnitLabel(weightUnit)} on average.
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
          </div>

          <section className="mt-10 w-full rounded-3xl bg-slate-50 px-7 py-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <dl className="space-y-6">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-6">
                <dt className="text-right text-base text-slate-600">Duration (min)</dt>
                <dd className="min-w-20 text-left text-4xl font-black tabular-nums text-slate-950">{durationMinutes}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-6">
                <dt className="text-right text-base text-slate-600">Total Lifted ({weightUnitLabel(weightUnit)})</dt>
                <dd className="min-w-20 text-left text-4xl font-black tabular-nums text-slate-950">{formatNumber(totalLifted)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <Link
          href={`/sessions/${session.id}`}
          className="mb-2 rounded-2xl bg-slate-950 px-5 py-4 text-center text-base font-black text-white shadow-lg shadow-slate-950/15 transition active:translate-y-px hover:bg-slate-800"
        >
          Next
        </Link>
      </div>
    </main>
  );
}
