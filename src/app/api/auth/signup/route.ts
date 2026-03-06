import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(parsed.data.password, 12);

    await db.insert(users).values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const dbCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (dbCode === "3D000" || dbCode === "42P01") {
      return NextResponse.json(
        {
          error: "Database is not initialized yet. Run `npm run db:setup` and retry.",
        },
        { status: 503 },
      );
    }

    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
