import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/db/client";
import { mealLogs } from "@/db/schema";

const createMealLogSchema = z.object({
  foodId: z.string().uuid(),
  quantity: z.number().positive().max(100),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
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
  const [inserted] = await db
    .insert(mealLogs)
    .values({
      userId: session.user.id,
      foodId: parsed.data.foodId,
      quantity: parsed.data.quantity.toString(),
      mealType: parsed.data.mealType,
      consumedAt: new Date(),
    })
    .returning({ id: mealLogs.id });

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
}
