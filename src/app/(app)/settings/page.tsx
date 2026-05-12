import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { FlyoverSelect } from "@/components/flyover-select";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import {
  getThemeTokenDefault,
  normalizeThemeOverrides,
  themeTokenDefinitions,
} from "@/lib/theme";
import { normalizeWeightUnit } from "@/lib/weight-unit";
import {
  resetThemeOverridesAction,
  updateThemeOverridesAction,
  updateWeightUnitAction,
} from "@/server/actions";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const db = getDb();

  const pref = await db
    .select({
      weightUnit: userPreferences.weightUnit,
      themeOverrides: userPreferences.themeOverrides,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const weightUnit = normalizeWeightUnit(pref?.weightUnit);
  const themeOverrides = normalizeThemeOverrides(pref?.themeOverrides);
  const cookieStore = await cookies();
  const themeMode = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <main className="max-w-3xl space-y-4">
      <section className="panel p-4">
        <h1 className="text-xl font-black text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Change your display unit for workout weight values. Stored workout numbers are not converted.
        </p>
      </section>

      <section className="panel p-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Weight Unit</h2>
        <form action={updateWeightUnitAction} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="text-sm text-slate-700">
            <span>Unit</span>
            <FlyoverSelect
              name="weightUnit"
              defaultValue={weightUnit}
              label="Weight unit"
              panelTitle="Choose weight unit"
              options={[
                { value: "lbs", label: "lbs" },
                { value: "kg", label: "kg" },
              ]}
              required
              className="mt-1 w-full sm:w-40"
              triggerClassName="rounded-lg py-2"
            />
          </div>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Save
          </button>
        </form>
      </section>

      <section className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Theme Tokens</h2>
            <p className="mt-1 text-sm text-slate-600">
              Override the CSS tokens that drive the app colors.
            </p>
          </div>
          <form action={resetThemeOverridesAction}>
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              Reset Theme
            </button>
          </form>
        </div>

        <form action={updateThemeOverridesAction} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {themeTokenDefinitions.map((token) => {
              const value = themeOverrides[token.key] ?? getThemeTokenDefault(token, themeMode);

              return (
                <label
                  key={token.key}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-background p-3"
                >
                  <input
                    type="color"
                    name={token.key}
                    defaultValue={value}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-line bg-surface p-1"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-foreground">{token.label}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted">{token.cssVar}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Save Theme
            </button>
            <p className="text-xs text-slate-500">
              Saved colors apply across the app wherever token classes are used.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
