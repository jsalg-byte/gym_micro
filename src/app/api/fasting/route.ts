import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getDb } from "@/db/client";
import { activeFasts, fastingLogs } from "@/db/schema";
import { authOptions } from "@/lib/auth";

const startFastSchema = z.object({
  action: z.literal("start"),
  note: z.string().trim().max(240).optional(),
});

const endFastSchema = z.object({
  action: z.literal("end"),
  note: z.string().trim().max(240).optional(),
});

const fastingActionSchema = z.discriminatedUnion("action", [startFastSchema, endFastSchema]);

async function requireSessionUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return userId ?? null;
}

export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [active] = await db
    .select({
      id: activeFasts.id,
      startedAt: activeFasts.startedAt,
      note: activeFasts.note,
    })
    .from(activeFasts)
    .where(eq(activeFasts.userId, userId))
    .limit(1);

  return NextResponse.json(
    {
      active: active
        ? {
            id: active.id,
            startedAt: active.startedAt.toISOString(),
            note: active.note,
          }
        : null,
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fastingActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();

  if (parsed.data.action === "start") {
    const startedAt = new Date();
    await db
      .insert(activeFasts)
      .values({
        userId,
        startedAt,
        note: parsed.data.note,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: activeFasts.userId,
        set: {
          startedAt,
          note: parsed.data.note,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json(
      {
        ok: true,
        active: {
          startedAt: startedAt.toISOString(),
          note: parsed.data.note ?? null,
        },
      },
      { status: 200 },
    );
  }

  const [active] = await db
    .select({
      id: activeFasts.id,
      startedAt: activeFasts.startedAt,
      note: activeFasts.note,
    })
    .from(activeFasts)
    .where(eq(activeFasts.userId, userId))
    .limit(1);

  if (!active) {
    return NextResponse.json({ error: "No active fast to end." }, { status: 404 });
  }

  const endedAt = new Date();
  const durationMinutes = Math.round((endedAt.getTime() - active.startedAt.getTime()) / 60000);

  if (durationMinutes <= 0 || durationMinutes > 60 * 24 * 7) {
    return NextResponse.json(
      { error: "Fast duration must be between 1 minute and 7 days." },
      { status: 400 },
    );
  }

  const [saved] = await db
    .insert(fastingLogs)
    .values({
      userId,
      startedAt: active.startedAt,
      endedAt,
      durationMinutes,
      note: parsed.data.note || active.note,
    })
    .returning({ id: fastingLogs.id });

  await db.delete(activeFasts).where(eq(activeFasts.id, active.id));

  return NextResponse.json(
    {
      ok: true,
      id: saved.id,
      durationMinutes,
    },
    { status: 201 },
  );
}
