import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { normalizeWeightUnit } from "@/lib/weight-unit";
import { updateWeightUnitAction } from "@/server/actions";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const db = getDb();

  const pref = await db
    .select({
      weightUnit: userPreferences.weightUnit,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const weightUnit = normalizeWeightUnit(pref?.weightUnit);

  return (
    <main className="max-w-xl space-y-4">
      <section className="panel p-4">
        <h1 className="text-xl font-black text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Change your display unit for workout weight values. Stored workout numbers are not converted.
        </p>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Weight Unit</h2>
        <form action={updateWeightUnitAction} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm text-slate-700">
            Unit
            <select
              name="weightUnit"
              defaultValue={weightUnit}
              className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </label>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Save
          </button>
        </form>
      </section>
    </main>
  );
}
