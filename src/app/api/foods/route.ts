import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/client";
import { foods } from "@/db/schema";

const createFoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  barcodeUpc: z
    .string()
    .trim()
    .regex(/^\d+$/)
    .min(8)
    .max(14)
    .optional(),
  caloriesKcal: z.number().int().nonnegative().max(2000),
  servingSizeG: z.number().positive().max(5000).optional(),
  proteinG: z.number().nonnegative().max(500).optional(),
  carbsG: z.number().nonnegative().max(500).optional(),
  fatG: z.number().nonnegative().max(500).optional(),
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
      proteinG: (parsed.data.proteinG ?? 0).toString(),
      carbsG: (parsed.data.carbsG ?? 0).toString(),
      fatG: (parsed.data.fatG ?? 0).toString(),
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
