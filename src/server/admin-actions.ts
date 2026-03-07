"use server";

import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireAdminUserId } from "@/lib/admin";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/)
  .transform((value) => value.toLowerCase());

const createUserSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(120).optional(),
  password: z.string().min(8).max(128),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  username: usernameSchema,
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(120).optional(),
  password: z.string().max(128).optional(),
});

const deleteUserSchema = z.object({
  id: z.string().uuid(),
});

export async function adminCreateUserAction(formData: FormData) {
  await requireAdminUserId();

  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    throw new Error("Invalid user payload");
  }

  const db = getDb();
  const passwordHash = await hash(parsed.data.password, 12);

  await db.insert(users).values({
    username: parsed.data.username,
    name: parsed.data.name || parsed.data.username,
    email: parsed.data.email,
    passwordHash,
  });

  revalidatePath("/admin");
}

export async function adminUpdateUserAction(formData: FormData) {
  await requireAdminUserId();

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    username: formData.get("username"),
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    password: formData.get("password") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid user update payload");
  }

  const db = getDb();
  const nextPasswordHash =
    parsed.data.password && parsed.data.password.length >= 8
      ? await hash(parsed.data.password, 12)
      : undefined;

  await db
    .update(users)
    .set({
      username: parsed.data.username,
      name: parsed.data.name || parsed.data.username,
      email: parsed.data.email,
      ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.data.id));

  revalidatePath("/admin");
}

export async function adminDeleteUserAction(formData: FormData) {
  const adminUserId = await requireAdminUserId();
  const parsed = deleteUserSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    throw new Error("Invalid user delete payload");
  }

  if (parsed.data.id === adminUserId) {
    throw new Error("You cannot delete your own admin account.");
  }

  const db = getDb();
  await db.delete(users).where(eq(users.id, parsed.data.id));

  revalidatePath("/admin");
}
