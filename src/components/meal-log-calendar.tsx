"use client";

import { useMemo, useState } from "react";

type MealLogEntry = {
  id: string;
  consumedAt: string;
  foodName: string;
  grams: number;
  mealType: string;
  servingSizeG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  formula: string;
  photoUrl: string | null;
};

type MealGroup = {
  key: string;
  consumedAt: string;
  mealType: string;
  items: MealLogEntry[];
  totalCaloriesKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  photos: string[];
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayKeyToDate(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toMealGroupKey(entry: MealLogEntry) {
  return `${entry.mealType}|${entry.consumedAt}`;
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MealLogCalendar({ entries }: { entries: MealLogEntry[] }) {
  const [month, setMonth] = useState(startOfMonth(entries[0] ? new Date(entries[0].consumedAt) : new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, MealLogEntry[]>();
    for (const entry of entries) {
      const key = formatDayKey(new Date(entry.consumedAt));
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const monthStart = startOfMonth(month);
  const startGrid = new Date(monthStart);
  startGrid.setDate(monthStart.getDate() - monthStart.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startGrid);
    date.setDate(startGrid.getDate() + index);
    const key = formatDayKey(date);
    const dayEntries = groupedByDay.get(key) ?? [];
    const mealCount = new Set(dayEntries.map((entry) => toMealGroupKey(entry))).size;

    return {
      key,
      date,
      isInCurrentMonth: date.getMonth() === monthStart.getMonth(),
      entries: dayEntries,
      mealCount,
    };
  });

  const selectedEntries = useMemo(() => {
    if (!selectedDayKey) {
      return [];
    }
    return groupedByDay.get(selectedDayKey) ?? [];
  }, [selectedDayKey, groupedByDay]);
  const selectedDate = selectedDayKey ? dayKeyToDate(selectedDayKey) : null;

  const selectedMealGroups = useMemo<MealGroup[]>(() => {
    const map = new Map<string, MealGroup>();

    for (const entry of selectedEntries) {
      const key = toMealGroupKey(entry);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          consumedAt: entry.consumedAt,
          mealType: entry.mealType,
          items: [entry],
          totalCaloriesKcal: entry.caloriesKcal,
          totalProteinG: entry.proteinG,
          totalCarbsG: entry.carbsG,
          totalFatG: entry.fatG,
          photos: entry.photoUrl ? [entry.photoUrl] : [],
        });
        continue;
      }

      existing.items.push(entry);
      existing.totalCaloriesKcal += entry.caloriesKcal;
      existing.totalProteinG = round1(existing.totalProteinG + entry.proteinG);
      existing.totalCarbsG = round1(existing.totalCarbsG + entry.carbsG);
      existing.totalFatG = round1(existing.totalFatG + entry.fatG);

      if (entry.photoUrl && !existing.photos.includes(entry.photoUrl)) {
        existing.photos.push(entry.photoUrl);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.consumedAt).getTime() - new Date(a.consumedAt).getTime(),
    );
  }, [selectedEntries]);

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900">Meal Log Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((prev) => addMonths(prev, -1))}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Prev
          </button>
          <p className="text-sm font-semibold text-slate-800">
            {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            onClick={() => setMonth((prev) => addMonths(prev, 1))}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((label) => (
          <p key={label} className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
        ))}
        {days.map((day) => (
          <div
            key={day.key}
            className={`min-h-[84px] rounded-lg border p-2 ${
              day.isInCurrentMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
            }`}
          >
            <p className={`text-xs font-semibold ${day.isInCurrentMonth ? "text-slate-800" : "text-slate-400"}`}>
              {day.date.getDate()}
            </p>
            {day.mealCount > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className="mt-2 rounded-md bg-cyan-100 px-2 py-1 text-left text-[11px] font-semibold text-cyan-900 hover:bg-cyan-200"
              >
                {day.mealCount} meal{day.mealCount > 1 ? "s" : ""}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {entries.length === 0 ? <p className="mt-3 text-sm text-slate-500">No meal logs yet.</p> : null}

      {selectedDayKey && selectedDate ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Meals on {formatDayLabel(selectedDate)}</h3>
                <p className="text-xs text-slate-600">
                  {selectedMealGroups.length} meal{selectedMealGroups.length === 1 ? "" : "s"} · {selectedEntries.length}{" "}
                  ingredient item{selectedEntries.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {selectedMealGroups.map((mealGroup) => (
                <li key={mealGroup.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold capitalize text-slate-900">{mealGroup.mealType}</p>
                  <p className="text-slate-600">{new Date(mealGroup.consumedAt).toLocaleTimeString()}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    Total {mealGroup.totalCaloriesKcal} kcal · Protein {mealGroup.totalProteinG}g · Carbs {mealGroup.totalCarbsG}g · Fat{" "}
                    {mealGroup.totalFatG}g
                  </p>

                  <ul className="mt-2 space-y-2">
                    {mealGroup.items.map((entry) => (
                      <li key={entry.id} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
                        <p className="font-semibold text-slate-800">
                          {entry.foodName} · {entry.grams}g
                        </p>
                        <p className="text-slate-600">
                          {entry.caloriesKcal} kcal · Protein {entry.proteinG}g · Carbs {entry.carbsG}g · Fat {entry.fatG}g
                        </p>
                        <p className="text-slate-500">Calc: {entry.formula}</p>
                      </li>
                    ))}
                  </ul>

                  {mealGroup.photos.length > 0 ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {mealGroup.photos.map((photoUrl) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={photoUrl}
                          src={photoUrl}
                          alt="Meal upload"
                          className="h-28 w-full rounded-md border border-slate-200 object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
