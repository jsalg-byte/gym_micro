import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { deleteObject } from "@/lib/storage";

const createProgressPhotoSchema = z.object({
  objectKey: z.string().min(4).max(512),
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
  capturedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  note: z.string().max(400).optional(),
});

const updateProgressPhotoSchema = z.object({
  id: z.string().uuid(),
  capturedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

const deleteProgressPhotoSchema = z.object({
  id: z.string().uuid(),
});

function parseCapturedAt(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }

  return new Date(value);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProgressPhotoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!parsed.data.mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed for progress photos." }, { status: 400 });
  }

  const db = getDb();
  const [upload] = await db
    .insert(uploads)
    .values({
      userId: session.user.id,
      entityType: "progress_photo",
      entityId: session.user.id,
      objectKey: parsed.data.objectKey,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      note: parsed.data.note,
      capturedAt: parseCapturedAt(parsed.data.capturedAt),
    })
    .returning({ id: uploads.id });

  return NextResponse.json({ ok: true, id: upload.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProgressPhotoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(uploads)
    .set({
      capturedAt: parseCapturedAt(parsed.data.capturedAt),
    })
    .where(
      and(
        eq(uploads.id, parsed.data.id),
        eq(uploads.userId, session.user.id),
        eq(uploads.entityType, "progress_photo"),
      ),
    )
    .returning({ id: uploads.id });

  if (!updated) {
    return NextResponse.json({ error: "Progress photo not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteProgressPhotoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select({
      id: uploads.id,
      objectKey: uploads.objectKey,
    })
    .from(uploads)
    .where(
      and(
        eq(uploads.id, parsed.data.id),
        eq(uploads.userId, session.user.id),
        eq(uploads.entityType, "progress_photo"),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Progress photo not found" }, { status: 404 });
  }

  await db.delete(uploads).where(eq(uploads.id, existing.id));

  try {
    await deleteObject({ key: existing.objectKey });
  } catch (error) {
    console.error("Failed deleting progress object from storage:", error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
