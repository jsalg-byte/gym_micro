import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[^\s]+$/, "Username cannot contain spaces.")
    .transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(80).optional(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return NextResponse.json(
      {
        error: firstIssue ? `Invalid payload: ${firstIssue}` : "Invalid payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, parsed.data.username))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const passwordHash = await hash(parsed.data.password, 12);

    await db.insert(users).values({
      username: parsed.data.username,
      name: parsed.data.name || parsed.data.username,
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
