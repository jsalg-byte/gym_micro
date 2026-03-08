import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/client";
import { mealLogs } from "@/db/schema";

const createMealLogSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  consumedAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        grams: z.number().positive().max(5000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMealLogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const consumedAt = parsed.data.consumedAt ? new Date(parsed.data.consumedAt) : new Date();
  const inserted = await db
    .insert(mealLogs)
    .values(
      parsed.data.items.map((item) => ({
        userId: session.user.id,
        foodId: item.foodId,
        quantity: item.grams.toString(),
        mealType: parsed.data.mealType,
        consumedAt,
      })),
    )
    .returning({ id: mealLogs.id });

  return NextResponse.json(
    {
      ok: true,
      id: inserted[0]?.id ?? null,
      ids: inserted.map((row) => row.id),
    },
    { status: 201 },
  );
}
