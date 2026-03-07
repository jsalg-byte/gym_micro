import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { foods, mealLogs, uploads } from "@/db/schema";
import { NutritionWorkflow } from "@/components/nutrition-workflow";
import { requireUserId } from "@/lib/session";

export default async function NutritionPage() {
  const userId = await requireUserId();
  const db = getDb();

  const [foodItems, logs] = await Promise.all([
    db.select().from(foods).orderBy(desc(foods.createdAt)).limit(50),
    db
      .select({
        id: mealLogs.id,
        quantity: mealLogs.quantity,
        mealType: mealLogs.mealType,
        consumedAt: mealLogs.consumedAt,
        foodName: foods.name,
        caloriesKcal: foods.caloriesKcal,
      })
      .from(mealLogs)
      .leftJoin(foods, eq(mealLogs.foodId, foods.id))
      .where(eq(mealLogs.userId, userId))
      .orderBy(desc(mealLogs.consumedAt))
      .limit(30),
  ]);

  const logIds = logs.map((log) => log.id);
  const mealPhotoRows =
    logIds.length > 0
      ? await db
          .select({
            entityId: uploads.entityId,
            objectKey: uploads.objectKey,
          })
          .from(uploads)
          .where(
            and(
              eq(uploads.userId, userId),
              eq(uploads.entityType, "meal_log_photo"),
              inArray(uploads.entityId, logIds),
            ),
          )
      : [];

  const mealPhotoByLogId = new Map<string, string>();
  for (const row of mealPhotoRows) {
    if (!mealPhotoByLogId.has(row.entityId)) {
      mealPhotoByLogId.set(row.entityId, row.objectKey);
    }
  }

  const foodOptions = foodItems.map((food) => ({
    id: food.id,
    name: food.name,
    barcodeUpc: food.barcodeUpc,
    servingSizeG: food.servingSizeG ? Number(food.servingSizeG) : null,
    caloriesKcal: food.caloriesKcal,
    proteinG: Number(food.proteinG),
    carbsG: Number(food.carbsG),
    fatG: Number(food.fatG),
  }));

  return (
    <main className="space-y-4">
      <section>
        <NutritionWorkflow foods={foodOptions} />
      </section>

      <section className="panel p-4">
        <h2 className="text-lg font-black text-slate-900">Recent Meal Logs</h2>
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">
                {log.foodName ?? "Food"} x{Number(log.quantity)} ({log.mealType})
              </p>
              <p className="text-slate-600">
                {new Date(log.consumedAt).toLocaleString()} · {log.caloriesKcal ?? 0} kcal each
              </p>
              {mealPhotoByLogId.has(log.id) ? (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Photo attached: {mealPhotoByLogId.get(log.id)}
                </p>
              ) : null}
            </li>
          ))}
          {logs.length === 0 ? <li className="text-sm text-slate-500">No meal logs yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
