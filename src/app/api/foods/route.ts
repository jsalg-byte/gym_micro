import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/client";
import { foods } from "@/db/schema";

const micronutrientSchema = z.object({
  name: z.string().trim().min(1).max(80),
  value: z.number().nonnegative().max(10000),
  unit: z.string().trim().min(1).max(12),
  confidence: z.number().min(0).max(1).optional(),
});

const createFoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  barcodeUpc: z
    .string()
    .trim()
    .regex(/^\d+$/)
    .min(8)
    .max(14)
    .optional(),
  mergeIntoExisting: z.boolean().optional(),
  caloriesKcal: z.number().int().nonnegative().max(2000),
  servingSizeText: z.string().trim().max(120).optional(),
  servingSizeG: z.number().positive().max(5000).optional(),
  servingsPerContainer: z.number().positive().max(1000).optional(),
  proteinG: z.number().nonnegative().max(500).optional(),
  carbsG: z.number().nonnegative().max(500).optional(),
  fatG: z.number().nonnegative().max(500).optional(),
  saturatedFatG: z.number().nonnegative().max(500).optional(),
  transFatG: z.number().nonnegative().max(500).optional(),
  cholesterolMg: z.number().nonnegative().max(50000).optional(),
  sodiumMg: z.number().nonnegative().max(50000).optional(),
  fiberG: z.number().nonnegative().max(500).optional(),
  sugarsG: z.number().nonnegative().max(500).optional(),
  addedSugarsG: z.number().nonnegative().max(500).optional(),
  micronutrients: z.array(micronutrientSchema).max(24).optional(),
  nutritionSource: z.enum(["manual", "barcode", "label_scan", "merged"]).optional(),
  parseConfidence: z.number().min(0).max(1).optional(),
  labelRawText: z.string().max(120000).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createFoodSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();

  if (parsed.data.barcodeUpc) {
    const [existingByBarcode] = await db
      .select()
      .from(foods)
      .where(eq(foods.barcodeUpc, parsed.data.barcodeUpc))
      .limit(1);

    if (existingByBarcode) {
      if (parsed.data.mergeIntoExisting) {
        const [updated] = await db
          .update(foods)
          .set({
            name: parsed.data.name || existingByBarcode.name,
            caloriesKcal: parsed.data.caloriesKcal,
            servingSizeText: parsed.data.servingSizeText ?? existingByBarcode.servingSizeText,
            servingSizeG: parsed.data.servingSizeG?.toString() ?? existingByBarcode.servingSizeG,
            servingsPerContainer:
              parsed.data.servingsPerContainer?.toString() ?? existingByBarcode.servingsPerContainer,
            proteinG: (parsed.data.proteinG ?? Number(existingByBarcode.proteinG)).toString(),
            carbsG: (parsed.data.carbsG ?? Number(existingByBarcode.carbsG)).toString(),
            fatG: (parsed.data.fatG ?? Number(existingByBarcode.fatG)).toString(),
            saturatedFatG:
              parsed.data.saturatedFatG !== undefined
                ? parsed.data.saturatedFatG.toString()
                : existingByBarcode.saturatedFatG,
            transFatG:
              parsed.data.transFatG !== undefined
                ? parsed.data.transFatG.toString()
                : existingByBarcode.transFatG,
            cholesterolMg:
              parsed.data.cholesterolMg !== undefined
                ? parsed.data.cholesterolMg.toString()
                : existingByBarcode.cholesterolMg,
            sodiumMg:
              parsed.data.sodiumMg !== undefined
                ? parsed.data.sodiumMg.toString()
                : existingByBarcode.sodiumMg,
            fiberG:
              parsed.data.fiberG !== undefined ? parsed.data.fiberG.toString() : existingByBarcode.fiberG,
            sugarsG:
              parsed.data.sugarsG !== undefined ? parsed.data.sugarsG.toString() : existingByBarcode.sugarsG,
            addedSugarsG:
              parsed.data.addedSugarsG !== undefined
                ? parsed.data.addedSugarsG.toString()
                : existingByBarcode.addedSugarsG,
            micronutrientsJson: parsed.data.micronutrients ?? existingByBarcode.micronutrientsJson,
            nutritionSource: parsed.data.nutritionSource ?? "merged",
            nutritionConfidence:
              parsed.data.parseConfidence !== undefined
                ? parsed.data.parseConfidence.toString()
                : existingByBarcode.nutritionConfidence,
            labelRawText: parsed.data.labelRawText ?? existingByBarcode.labelRawText,
          })
          .where(eq(foods.id, existingByBarcode.id))
          .returning({
            id: foods.id,
            name: foods.name,
          });

        return NextResponse.json(
          {
            ok: true,
            reused: true,
            merged: true,
            food: updated,
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          reused: true,
          food: {
            id: existingByBarcode.id,
            name: existingByBarcode.name,
          },
        },
        { status: 200 },
      );
    }
  }

  const [inserted] = await db
    .insert(foods)
    .values({
      name: parsed.data.name,
      barcodeUpc: parsed.data.barcodeUpc,
      caloriesKcal: parsed.data.caloriesKcal,
      servingSizeG: parsed.data.servingSizeG?.toString(),
      servingSizeText: parsed.data.servingSizeText,
      servingsPerContainer: parsed.data.servingsPerContainer?.toString(),
      proteinG: (parsed.data.proteinG ?? 0).toString(),
      carbsG: (parsed.data.carbsG ?? 0).toString(),
      fatG: (parsed.data.fatG ?? 0).toString(),
      saturatedFatG: parsed.data.saturatedFatG?.toString(),
      transFatG: parsed.data.transFatG?.toString(),
      cholesterolMg: parsed.data.cholesterolMg?.toString(),
      sodiumMg: parsed.data.sodiumMg?.toString(),
      fiberG: parsed.data.fiberG?.toString(),
      sugarsG: parsed.data.sugarsG?.toString(),
      addedSugarsG: parsed.data.addedSugarsG?.toString(),
      micronutrientsJson: parsed.data.micronutrients,
      nutritionSource: parsed.data.nutritionSource ?? (parsed.data.barcodeUpc ? "barcode" : "manual"),
      nutritionConfidence: parsed.data.parseConfidence?.toString(),
      labelRawText: parsed.data.labelRawText,
      createdByUserId: session.user.id,
    })
    .returning({ id: foods.id, name: foods.name });

  return NextResponse.json(
    {
      ok: true,
      reused: false,
      food: inserted,
    },
    { status: 201 },
  );
}
