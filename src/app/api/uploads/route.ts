import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { authOptions } from "@/lib/auth";

const createUploadSchema = z.object({
  entityType: z.string().min(2).max(40),
  entityId: z.string().min(1).max(64),
  objectKey: z.string().min(4).max(512),
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const [upload] = await db
    .insert(uploads)
    .values({
      userId: session.user.id,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      objectKey: parsed.data.objectKey,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    })
    .returning({ id: uploads.id });

  return NextResponse.json({ ok: true, id: upload.id }, { status: 201 });
}
