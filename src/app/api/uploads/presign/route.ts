import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createPresignedUploadUrl } from "@/lib/storage";

const payloadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(3).max(128),
});

function extFromName(fileName: string) {
  const split = fileName.split(".");
  if (split.length < 2) {
    return "bin";
  }

  return split.at(-1)?.toLowerCase() ?? "bin";
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!parsed.data.contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
  }

  const key = `${session.user.id}/${Date.now()}-${randomUUID()}.${extFromName(parsed.data.fileName)}`;
  const presigned = await createPresignedUploadUrl({
    key,
    contentType: parsed.data.contentType,
  });

  return NextResponse.json(presigned);
}
