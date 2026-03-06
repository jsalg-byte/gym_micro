"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import {
  exercises,
  foods,
  mealLogs,
  routineDayExercises,
  routineDays,
  routines,
  userPreferences,
  workoutSessions,
  workoutSets,
} from "@/db/schema";
import { requireUserId } from "@/lib/session";

const routineSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(200).optional(),
});

const routineDaySchema = z.object({
  routineId: z.string().uuid(),
  dayName: z.string().trim().min(2).max(32),
});

const routineDayExerciseSchema = z.object({
  routineDayId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  targetSets: z.number().int().positive().max(20).optional(),
  targetReps: z.number().int().positive().max(50).optional(),
  targetWeight: z.number().nonnegative().max(2000).optional(),
});

const deleteRoutineSchema = z.object({
  routineId: z.string().uuid(),
});

const removeRoutineDayExerciseSchema = z.object({
  routineDayExerciseId: z.string().uuid(),
});

const activeRoutineSchema = z.object({
  routineId: z.string().uuid(),
});

const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(["strength", "cardio", "mobility"]).default("strength"),
  muscleGroup: z.string().trim().max(80).optional(),
});

const startSessionSchema = z.object({
  routineDayId: z.string().uuid(),
});

const setSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  reps: z.number().int().positive().max(100),
  weight: z.number().nonnegative().max(2000).optional(),
  isWarmup: z.boolean().optional(),
});

const foodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  barcodeUpc: z
    .string()
    .trim()
    .regex(/^\d+$/)
    .min(8)
    .max(14)
    .optional(),
  caloriesKcal: z.number().int().nonnegative().max(2000),
  servingSizeG: z.number().positive().max(5000).optional(),
  proteinG: z.number().nonnegative().max(500).optional(),
  carbsG: z.number().nonnegative().max(500).optional(),
  fatG: z.number().nonnegative().max(500).optional(),
});

const mealLogSchema = z.object({
  foodId: z.string().uuid(),
  quantity: z.number().positive().max(100),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
});

export async function createRoutineAction(formData: FormData) {
  const userId = await requireUserId();

  const parsed = routineSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid routine payload");
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    const [insertedRoutine] = await tx
      .insert(routines)
      .values({
        userId,
        name: parsed.data.name,
        description: parsed.data.description,
      })
      .returning({ id: routines.id });

    // Ensure every routine is valid immediately with at least one day.
    await tx.insert(routineDays).values({
      routineId: insertedRoutine.id,
      dayName: "Day 1",
      sortOrder: 0,
    });
  });

  revalidatePath("/routines");
  revalidatePath("/sessions");
}

export async function createRoutineDayAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = routineDaySchema.safeParse({
    routineId: formData.get("routineId"),
    dayName: formData.get("dayName"),
  });

  if (!parsed.success) {
    throw new Error("Invalid routine day payload");
  }

  const db = getDb();
  const [routine] = await db
    .select({ id: routines.id })
    .from(routines)
    .where(and(eq(routines.id, parsed.data.routineId), eq(routines.userId, userId)))
    .limit(1);

  if (!routine) {
    throw new Error("Routine not found");
  }

  const [lastDay] = await db
    .select({ sortOrder: routineDays.sortOrder })
    .from(routineDays)
    .where(eq(routineDays.routineId, routine.id))
    .orderBy(desc(routineDays.sortOrder))
    .limit(1);

  await db.insert(routineDays).values({
    routineId: routine.id,
    dayName: parsed.data.dayName,
    sortOrder: (lastDay?.sortOrder ?? -1) + 1,
  });

  revalidatePath("/routines");
  revalidatePath("/sessions");
}

export async function addExerciseToRoutineDayAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = routineDayExerciseSchema.safeParse({
    routineDayId: formData.get("routineDayId"),
    exerciseId: formData.get("exerciseId"),
    targetSets: formData.get("targetSets") ? Number(formData.get("targetSets")) : undefined,
    targetReps: formData.get("targetReps") ? Number(formData.get("targetReps")) : undefined,
    targetWeight: formData.get("targetWeight") ? Number(formData.get("targetWeight")) : undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid routine-day exercise payload");
  }

  const db = getDb();
  const [day] = await db
    .select({ id: routineDays.id })
    .from(routineDays)
    .innerJoin(routines, eq(routineDays.routineId, routines.id))
    .where(and(eq(routineDays.id, parsed.data.routineDayId), eq(routines.userId, userId)))
    .limit(1);

  if (!day) {
    throw new Error("Routine day not found");
  }

  const [lastExercise] = await db
    .select({ sortOrder: routineDayExercises.sortOrder })
    .from(routineDayExercises)
    .where(eq(routineDayExercises.routineDayId, parsed.data.routineDayId))
    .orderBy(desc(routineDayExercises.sortOrder))
    .limit(1);

  await db.insert(routineDayExercises).values({
    routineDayId: parsed.data.routineDayId,
    exerciseId: parsed.data.exerciseId,
    sortOrder: (lastExercise?.sortOrder ?? -1) + 1,
    targetSets: parsed.data.targetSets ?? 3,
    targetReps: parsed.data.targetReps,
    targetWeight: parsed.data.targetWeight?.toString(),
  });

  revalidatePath("/routines");
  revalidatePath("/sessions");
}

export async function deleteRoutineAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = deleteRoutineSchema.safeParse({
    routineId: formData.get("routineId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid delete routine payload");
  }

  const db = getDb();
  await db
    .delete(routines)
    .where(and(eq(routines.id, parsed.data.routineId), eq(routines.userId, userId)));

  revalidatePath("/routines");
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function removeExerciseFromRoutineDayAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = removeRoutineDayExerciseSchema.safeParse({
    routineDayExerciseId: formData.get("routineDayExerciseId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid remove routine-day exercise payload");
  }

  const db = getDb();
  const [entry] = await db
    .select({ id: routineDayExercises.id })
    .from(routineDayExercises)
    .innerJoin(routineDays, eq(routineDayExercises.routineDayId, routineDays.id))
    .innerJoin(routines, eq(routineDays.routineId, routines.id))
    .where(and(eq(routineDayExercises.id, parsed.data.routineDayExerciseId), eq(routines.userId, userId)))
    .limit(1);

  if (!entry) {
    throw new Error("Routine day exercise not found");
  }

  await db.delete(routineDayExercises).where(eq(routineDayExercises.id, entry.id));

  revalidatePath("/routines");
  revalidatePath("/sessions");
}

export async function setActiveRoutineAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = activeRoutineSchema.safeParse({
    routineId: formData.get("routineId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid active routine payload");
  }

  const db = getDb();
  const [routine] = await db
    .select({ id: routines.id })
    .from(routines)
    .where(and(eq(routines.id, parsed.data.routineId), eq(routines.userId, userId)))
    .limit(1);

  if (!routine) {
    throw new Error("Routine not found");
  }

  await db
    .insert(userPreferences)
    .values({
      userId,
      activeRoutineId: routine.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        activeRoutineId: routine.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/routines");
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function createExerciseAction(formData: FormData) {
  const userId = await requireUserId();

  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || "strength",
    muscleGroup: formData.get("muscleGroup") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid exercise payload");
  }

  const db = getDb();
  await db.insert(exercises).values({
    name: parsed.data.name,
    category: parsed.data.category,
    muscleGroup: parsed.data.muscleGroup,
    createdByUserId: userId,
  });

  revalidatePath("/exercises");
  revalidatePath("/sessions");
}

export async function startWorkoutSessionAction(formData: FormData) {
  const userId = await requireUserId();

  const parsed = startSessionSchema.safeParse({
    routineDayId: formData.get("routineDayId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid session payload");
  }

  const db = getDb();
  const [day] = await db
    .select({
      routineId: routineDays.routineId,
    })
    .from(routineDays)
    .innerJoin(routines, eq(routineDays.routineId, routines.id))
    .where(and(eq(routineDays.id, parsed.data.routineDayId), eq(routines.userId, userId)))
    .limit(1);

  if (!day) {
    throw new Error("Routine day not found");
  }

  await db.insert(workoutSessions).values({
    userId,
    routineId: day.routineId,
    routineDayId: parsed.data.routineDayId,
    status: "active",
  });

  revalidatePath("/sessions");
}

export async function addWorkoutSetAction(formData: FormData) {
  const userId = await requireUserId();

  const parsed = setSchema.safeParse({
    sessionId: formData.get("sessionId"),
    exerciseId: formData.get("exerciseId"),
    reps: Number(formData.get("reps")),
    weight: formData.get("weight") ? Number(formData.get("weight")) : undefined,
    isWarmup: formData.get("isWarmup") === "on",
  });

  if (!parsed.success) {
    throw new Error("Invalid workout set payload");
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.id, parsed.data.sessionId), eq(workoutSessions.userId, userId)),
    )
    .limit(1);

  if (!session) {
    throw new Error("Workout session not found");
  }

  const [lastSet] = await db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, parsed.data.sessionId))
    .orderBy(desc(workoutSets.setOrder))
    .limit(1);

  await db.insert(workoutSets).values({
    sessionId: parsed.data.sessionId,
    exerciseId: parsed.data.exerciseId,
    reps: parsed.data.reps,
    weight: parsed.data.weight?.toString(),
    isWarmup: parsed.data.isWarmup ?? false,
    setOrder: (lastSet?.setOrder ?? 0) + 1,
  });

  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  revalidatePath("/sessions");
}

export async function completeWorkoutSessionAction(formData: FormData) {
  const userId = await requireUserId();
  const sessionId = formData.get("sessionId");

  if (typeof sessionId !== "string") {
    throw new Error("Session ID is required");
  }

  const db = getDb();
  await db
    .update(workoutSessions)
    .set({
      status: "completed",
      endedAt: new Date(),
    })
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));

  revalidatePath("/sessions");
  revalidatePath(`/sessions/${sessionId}`);
}

export async function createFoodAction(formData: FormData) {
  const userId = await requireUserId();

  const parsed = foodSchema.safeParse({
    name: formData.get("name"),
    barcodeUpc: formData.get("barcodeUpc") || undefined,
    caloriesKcal: Number(formData.get("caloriesKcal")),
    servingSizeG: formData.get("servingSizeG") ? Number(formData.get("servingSizeG")) : undefined,
    proteinG: formData.get("proteinG") ? Number(formData.get("proteinG")) : 0,
    carbsG: formData.get("carbsG") ? Number(formData.get("carbsG")) : 0,
    fatG: formData.get("fatG") ? Number(formData.get("fatG")) : 0,
  });

  if (!parsed.success) {
    throw new Error("Invalid food payload");
  }

  const db = getDb();
  await db.insert(foods).values({
    name: parsed.data.name,
    barcodeUpc: parsed.data.barcodeUpc,
    caloriesKcal: parsed.data.caloriesKcal,
    servingSizeG: parsed.data.servingSizeG?.toString(),
    proteinG: parsed.data.proteinG?.toString() ?? "0",
    carbsG: parsed.data.carbsG?.toString() ?? "0",
    fatG: parsed.data.fatG?.toString() ?? "0",
    createdByUserId: userId,
  });

  revalidatePath("/nutrition");
}

export async function createMealLogAction(formData: FormData) {
  const userId = await requireUserId();

  const parsed = mealLogSchema.safeParse({
    foodId: formData.get("foodId"),
    quantity: Number(formData.get("quantity")),
    mealType: formData.get("mealType"),
  });

  if (!parsed.success) {
    throw new Error("Invalid meal log payload");
  }

  const db = getDb();
  await db.insert(mealLogs).values({
    userId,
    foodId: parsed.data.foodId,
    quantity: parsed.data.quantity.toString(),
    mealType: parsed.data.mealType,
    consumedAt: new Date(),
  });

  revalidatePath("/nutrition");
}
