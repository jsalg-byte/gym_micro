import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { foods, mealLogs, uploads } from "@/db/schema";
import { MealLogCalendar } from "@/components/meal-log-calendar";
import { NutritionWorkflow } from "@/components/nutrition-workflow";
import { createPresignedReadUrl } from "@/lib/storage";
import { requireUserId } from "@/lib/session";

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

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
        servingSizeG: foods.servingSizeG,
        proteinG: foods.proteinG,
        carbsG: foods.carbsG,
        fatG: foods.fatG,
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
    servingSizeText: food.servingSizeText ?? null,
    servingsPerContainer: food.servingsPerContainer ? Number(food.servingsPerContainer) : null,
    caloriesKcal: food.caloriesKcal,
    proteinG: Number(food.proteinG),
    carbsG: Number(food.carbsG),
    fatG: Number(food.fatG),
    saturatedFatG: food.saturatedFatG ? Number(food.saturatedFatG) : null,
    transFatG: food.transFatG ? Number(food.transFatG) : null,
    cholesterolMg: food.cholesterolMg ? Number(food.cholesterolMg) : null,
    sodiumMg: food.sodiumMg ? Number(food.sodiumMg) : null,
    fiberG: food.fiberG ? Number(food.fiberG) : null,
    sugarsG: food.sugarsG ? Number(food.sugarsG) : null,
    addedSugarsG: food.addedSugarsG ? Number(food.addedSugarsG) : null,
    micronutrients: Array.isArray(food.micronutrientsJson) ? food.micronutrientsJson : [],
  }));

  const mealLogCalendarEntries = await Promise.all(
    logs.map(async (log) => {
      const grams = Number(log.quantity);
      const servingSizeGRaw = Number(log.servingSizeG ?? 100);
      const servingSizeG = servingSizeGRaw > 0 ? servingSizeGRaw : 100;
      const factor = grams / servingSizeG;
      const caloriesKcal = Math.round((log.caloriesKcal ?? 0) * factor);
      const proteinG = round1(Number(log.proteinG ?? 0) * factor);
      const carbsG = round1(Number(log.carbsG ?? 0) * factor);
      const fatG = round1(Number(log.fatG ?? 0) * factor);
      const photoKey = mealPhotoByLogId.get(log.id);

      return {
        id: log.id,
        consumedAt: log.consumedAt.toISOString(),
        foodName: log.foodName ?? "Food",
        grams,
        mealType: log.mealType,
        servingSizeG,
        caloriesKcal,
        proteinG,
        carbsG,
        fatG,
        formula: `(${log.caloriesKcal ?? 0} kcal / ${servingSizeG}g) x ${grams}g = ${caloriesKcal} kcal`,
        photoUrl: photoKey
          ? await createPresignedReadUrl({
              key: photoKey,
              maxAgeSec: 900,
            })
          : null,
      };
    }),
  );

  return (
    <main className="space-y-4">
      <section className="panel p-4">
        <h1 className="text-lg font-black text-slate-900">Nutrition</h1>
        <p className="mt-1 text-sm text-slate-600">
          Start by adding a food item to your library. Once saved, you can select it and log meals.
        </p>
      </section>

      <section>
        <NutritionWorkflow foods={foodOptions} />
      </section>

      <MealLogCalendar entries={mealLogCalendarEntries} />
    </main>
  );
}
