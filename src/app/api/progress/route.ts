import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { authOptions } from "@/lib/auth";

const createProgressPhotoSchema = z.object({
  objectKey: z.string().min(4).max(512),
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
  capturedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  note: z.string().max(400).optional(),
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
