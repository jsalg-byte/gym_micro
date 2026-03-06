"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FoodOption = {
  id: string;
  name: string;
  barcodeUpc: string | null;
  servingSizeG: number | null;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type BarcodeLookupResponse = {
  found: boolean;
  source: "local" | "openfoodfacts" | "none";
  name?: string;
  servingSizeG?: number;
  caloriesKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  food?: {
    id: string;
    name: string;
    barcodeUpc?: string;
    servingSizeG?: number;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
};

type Mode = "log" | "add";

export function NutritionWorkflow({ foods }: { foods: FoodOption[] }) {
  const router = useRouter();
  const initialMode: Mode = foods.length > 0 ? "log" : "add";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [logFoodId, setLogFoodId] = useState(foods[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [mealType, setMealType] = useState("breakfast");

  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [servingSizeG, setServingSizeG] = useState("");
  const [caloriesKcal, setCaloriesKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [lookupInfo, setLookupInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedFoodPreview = useMemo(
    () => foods.find((food) => food.id === logFoodId) ?? null,
    [foods, logFoodId],
  );

  async function submitMealLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLogError(null);
    setLoading(true);

    const response = await fetch("/api/meals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        foodId: logFoodId,
        quantity: Number(quantity),
        mealType,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setLogError(payload?.error ?? "Unable to log meal.");
      return;
    }

    setQuantity("1");
    router.refresh();
  }

  async function lookupBarcode() {
    const code = barcode.trim();

    if (!/^\d{8,14}$/.test(code)) {
      setAddError("Enter an 8-14 digit barcode.");
      return;
    }

    setAddError(null);
    setLookupInfo(null);
    setLoading(true);

    const response = await fetch(`/api/barcode/${code}`);
    const payload = (await response.json().catch(() => null)) as BarcodeLookupResponse | { error?: string } | null;

    setLoading(false);

    if (!response.ok) {
      setAddError((payload as { error?: string } | null)?.error ?? "Barcode lookup failed.");
      return;
    }

    const result = payload as BarcodeLookupResponse;
    if (!result.found) {
      setLookupInfo("No product found for this barcode. You can enter details manually.");
      return;
    }

    if (result.food?.id) {
      setLookupInfo(`Found existing food: ${result.food.name}. You can use it directly in meal log.`);
      setMode("log");
      setLogFoodId(result.food.id);
      return;
    }

    setName(result.name ?? "");
    setServingSizeG(String(Math.round(result.servingSizeG ?? 100)));
    setCaloriesKcal(String(Math.round(result.caloriesKcal ?? 0)));
    setProteinG(String(Math.round(result.proteinG ?? 0)));
    setCarbsG(String(Math.round(result.carbsG ?? 0)));
    setFatG(String(Math.round(result.fatG ?? 0)));
    setLookupInfo(`Filled nutrition values from ${result.source}. Review and save.`);
  }

  async function submitFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);
    setLoading(true);

    const response = await fetch("/api/foods", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        barcodeUpc: barcode.trim() || undefined,
        caloriesKcal: Number(caloriesKcal),
        servingSizeG: servingSizeG ? Number(servingSizeG) : undefined,
        proteinG: Number(proteinG || "0"),
        carbsG: Number(carbsG || "0"),
        fatG: Number(fatG || "0"),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          food?: { id: string };
          reused?: boolean;
        }
      | null;

    setLoading(false);

    if (!response.ok) {
      setAddError(payload?.error ?? "Unable to save food.");
      return;
    }

    if (payload?.food?.id) {
      setLogFoodId(payload.food.id);
      setMode("log");
    }

    router.refresh();
  }

  if (mode === "log") {
    return (
      <article className="panel p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-black text-slate-900">Log Meal</h1>
            <p className="text-xs text-slate-600">Choose a saved food and log quantity.</p>
          </div>
          <button
            type="button"
            onClick={() => setMode("add")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Add New Food
          </button>
        </div>

        {foods.length === 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Add at least one food first, then log meals.
          </div>
        ) : (
          <form onSubmit={submitMealLog} className="mt-3 space-y-2">
            <select
              value={logFoodId}
              onChange={(event) => setLogFoodId(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {foods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name} ({food.caloriesKcal} kcal)
                </option>
              ))}
            </select>
            {selectedFoodPreview ? (
              <p className="text-xs text-slate-600">
                Serving {selectedFoodPreview.servingSizeG ?? "-"}g ·
                {" "}
                Protein {selectedFoodPreview.proteinG}g · Carbs {selectedFoodPreview.carbsG}g · Fat{" "}
                {selectedFoodPreview.fatG}g
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                step="0.1"
                min="0.1"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <select
                value={mealType}
                onChange={(event) => setMealType(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Log Meal"}
            </button>
            {logError ? <p className="text-sm text-rose-600">{logError}</p> : null}
          </form>
        )}
      </article>
    );
  }

  return (
    <article className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">Add Food</h2>
          <p className="text-xs text-slate-600">
            Use barcode lookup to autofill calories/macros, then save the food for meal logging.
          </p>
        </div>
        {foods.length > 0 ? (
          <button
            type="button"
            onClick={() => setMode("log")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Meal Log
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="Barcode (UPC/EAN)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="button"
          onClick={lookupBarcode}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Lookup
        </button>
      </div>
      {lookupInfo ? <p className="mt-2 text-xs text-emerald-700">{lookupInfo}</p> : null}

      <form onSubmit={submitFood} className="mt-3 space-y-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Food name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-600">
            Serving Size (g)
            <input
              value={servingSizeG}
              onChange={(event) => setServingSizeG(event.target.value)}
              type="number"
              min={1}
              step="1"
              required
              placeholder="100"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-xs text-slate-600">
            Calories (kcal)
            <input
              value={caloriesKcal}
              onChange={(event) => setCaloriesKcal(event.target.value)}
              type="number"
              min={0}
              required
              placeholder="120"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-xs text-slate-600">
            Protein (g)
            <input
              value={proteinG}
              onChange={(event) => setProteinG(event.target.value)}
              type="number"
              min={0}
              step="1"
              placeholder="10"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-xs text-slate-600">
            Carbs (g)
            <input
              value={carbsG}
              onChange={(event) => setCarbsG(event.target.value)}
              type="number"
              min={0}
              step="1"
              placeholder="15"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="text-xs text-slate-600">
            Fat (g)
            <input
              value={fatG}
              onChange={(event) => setFatG(event.target.value)}
              type="number"
              min={0}
              step="1"
              placeholder="5"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Food"}
        </button>
        {addError ? <p className="text-sm text-rose-600">{addError}</p> : null}
      </form>
    </article>
  );
}
