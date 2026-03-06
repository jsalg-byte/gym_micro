import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { foods } from "@/db/schema";
import { lookupOpenFoodFacts } from "@/lib/barcode";
import { withRateLimit } from "@/lib/redis";

const paramsSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8)
    .max(14)
    .regex(/^\d+$/),
});

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const code = parsed.data.code;
  const limiter = await withRateLimit(`barcode:${code}`, 40, 60);

  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const db = getDb();
  const [localFood] = await db.select().from(foods).where(eq(foods.barcodeUpc, code)).limit(1);

  if (localFood) {
    return NextResponse.json({
      found: true,
      source: "local",
      food: {
        id: localFood.id,
        name: localFood.name,
        barcodeUpc: localFood.barcodeUpc,
        servingSizeG: Number(localFood.servingSizeG ?? 0),
        caloriesKcal: localFood.caloriesKcal,
        proteinG: Number(localFood.proteinG),
        carbsG: Number(localFood.carbsG),
        fatG: Number(localFood.fatG),
      },
    });
  }

  try {
    const external = await lookupOpenFoodFacts(code);
    return NextResponse.json(external);
  } catch {
    return NextResponse.json({
      found: false,
      source: "none",
    });
  }
}
