"use server";

import { and, asc, desc, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import {
  exerciseGifOverrides,
  exercises,
  friendRequests,
  foods,
  mealLogs,
  routineDayExercises,
  routineDays,
  routines,
  userPreferences,
  users,
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

const updateRoutineDaySchema = z.object({
  routineDayId: z.string().uuid(),
  dayName: z.string().trim().min(2).max(32),
});

const deleteRoutineDaySchema = z.object({
  routineDayId: z.string().uuid(),
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

const createAndAttachExerciseSchema = z.object({
  routineDayId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  category: z.enum(["strength", "cardio", "mobility"]).default("strength"),
  muscleGroup: z.string().trim().max(80).optional(),
  targetSets: z.number().int().positive().max(20).optional(),
  targetReps: z.number().int().positive().max(50).optional(),
  targetWeight: z.number().nonnegative().max(2000).optional(),
});

const createExerciseForSessionSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  category: z.enum(["strength", "cardio", "mobility"]).default("strength"),
  muscleGroup: z.string().trim().max(80).optional(),
  targetReps: z.number().int().positive().max(50).optional(),
  targetWeight: z.number().nonnegative().max(2000).optional(),
});

const weightUnitSchema = z.object({
  weightUnit: z.enum(["kg", "lbs"]),
});

const setExerciseGifOverrideSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  gifUrl: z.string().url().max(500),
  sourceExerciseId: z.string().trim().max(64).optional(),
  sourceName: z.string().trim().max(160).optional(),
});

const sendFriendRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[^\s]+$/)
    .transform((value) => value.toLowerCase()),
});

const friendRequestDecisionSchema = z.object({
  requestId: z.string().uuid(),
});

const removeFriendSchema = z.object({
  friendUserId: z.string().uuid(),
});

const startSessionSchema = z.object({
  routineDayId: z.string().uuid(),
  startedAtDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const setSchema = z.object({
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  reps: z.number().int().positive().max(100),
  weight: z.number().nonnegative().max(2000).optional(),
  isWarmup: z.boolean().optional(),
});

const updateSetSchema = z.object({
  setId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  reps: z.number().int().positive().max(100),
  weight: z.number().nonnegative().max(2000).optional(),
  isWarmup: z.boolean().optional(),
});

const deleteSetSchema = z.object({
  setId: z.string().uuid(),
});

const cancelSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

const deleteSessionSchema = z.object({
  sessionId: z.string().uuid(),
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

export async function updateRoutineDayAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = updateRoutineDaySchema.safeParse({
    routineDayId: formData.get("routineDayId"),
    dayName: formData.get("dayName"),
  });

  if (!parsed.success) {
    throw new Error("Invalid routine day update payload");
  }

  const db = getDb();
  const [day] = await db
    .select({
      id: routineDays.id,
    })
    .from(routineDays)
    .innerJoin(routines, eq(routineDays.routineId, routines.id))
    .where(and(eq(routineDays.id, parsed.data.routineDayId), eq(routines.userId, userId)))
    .limit(1);

  if (!day) {
    throw new Error("Routine day not found");
  }

  await db
    .update(routineDays)
    .set({
      dayName: parsed.data.dayName,
    })
    .where(eq(routineDays.id, day.id));

  revalidatePath("/routines");
  revalidatePath("/sessions");
}

export async function deleteRoutineDayAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = deleteRoutineDaySchema.safeParse({
    routineDayId: formData.get("routineDayId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid delete routine day payload");
  }

  const db = getDb();
  const [day] = await db
    .select({
      id: routineDays.id,
      routineId: routineDays.routineId,
    })
    .from(routineDays)
    .innerJoin(routines, eq(routineDays.routineId, routines.id))
    .where(and(eq(routineDays.id, parsed.data.routineDayId), eq(routines.userId, userId)))
    .limit(1);

  if (!day) {
    throw new Error("Routine day not found");
  }

  const routineDayCount = await db.$count(routineDays, eq(routineDays.routineId, day.routineId));
  if (routineDayCount <= 1) {
    throw new Error("A workout plan must keep at least one day");
  }

  await db.delete(routineDays).where(eq(routineDays.id, day.id));

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

export async function createAndAttachExerciseToRoutineDayAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createAndAttachExerciseSchema.safeParse({
    routineDayId: formData.get("routineDayId"),
    name: formData.get("name"),
    category: formData.get("category") || "strength",
    muscleGroup: formData.get("muscleGroup") || undefined,
    targetSets: formData.get("targetSets") ? Number(formData.get("targetSets")) : undefined,
    targetReps: formData.get("targetReps") ? Number(formData.get("targetReps")) : undefined,
    targetWeight: formData.get("targetWeight") ? Number(formData.get("targetWeight")) : undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid create-and-attach exercise payload");
  }

  const db = getDb();
  const [day] = await db
    .select({
      id: routineDays.id,
    })
    .from(routineDays)
    .innerJoin(routines, eq(routineDays.routineId, routines.id))
    .where(and(eq(routineDays.id, parsed.data.routineDayId), eq(routines.userId, userId)))
    .limit(1);

  if (!day) {
    throw new Error("Routine day not found");
  }

  const [insertedExercise] = await db
    .insert(exercises)
    .values({
      name: parsed.data.name,
      category: parsed.data.category,
      muscleGroup: parsed.data.muscleGroup,
      createdByUserId: userId,
    })
    .returning({
      id: exercises.id,
    });

  const [lastExercise] = await db
    .select({ sortOrder: routineDayExercises.sortOrder })
    .from(routineDayExercises)
    .where(eq(routineDayExercises.routineDayId, parsed.data.routineDayId))
    .orderBy(desc(routineDayExercises.sortOrder))
    .limit(1);

  await db.insert(routineDayExercises).values({
    routineDayId: parsed.data.routineDayId,
    exerciseId: insertedExercise.id,
    sortOrder: (lastExercise?.sortOrder ?? -1) + 1,
    targetSets: parsed.data.targetSets ?? 3,
    targetReps: parsed.data.targetReps,
    targetWeight: parsed.data.targetWeight?.toString(),
  });

  revalidatePath("/routines");
  revalidatePath("/exercises");
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
  revalidatePath("/routines");
  revalidatePath("/sessions");
}

export async function createExerciseForSessionAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createExerciseForSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    name: formData.get("name"),
    category: formData.get("category") || "strength",
    muscleGroup: formData.get("muscleGroup") || undefined,
    targetReps: formData.get("targetReps") ? Number(formData.get("targetReps")) : undefined,
    targetWeight: formData.get("targetWeight") ? Number(formData.get("targetWeight")) : undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid create exercise for session payload");
  }

  const db = getDb();
  const [session] = await db
    .select({
      id: workoutSessions.id,
      routineDayId: workoutSessions.routineDayId,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, parsed.data.sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);

  if (!session) {
    throw new Error("Workout session not found");
  }

  const [insertedExercise] = await db
    .insert(exercises)
    .values({
      name: parsed.data.name,
      category: parsed.data.category,
      muscleGroup: parsed.data.muscleGroup,
      createdByUserId: userId,
    })
    .returning({
      id: exercises.id,
    });

  if (session.routineDayId) {
    const [lastExercise] = await db
      .select({ sortOrder: routineDayExercises.sortOrder })
      .from(routineDayExercises)
      .where(eq(routineDayExercises.routineDayId, session.routineDayId))
      .orderBy(desc(routineDayExercises.sortOrder))
      .limit(1);

    await db.insert(routineDayExercises).values({
      routineDayId: session.routineDayId,
      exerciseId: insertedExercise.id,
      sortOrder: (lastExercise?.sortOrder ?? -1) + 1,
      targetSets: 3,
      targetReps: parsed.data.targetReps,
      targetWeight: parsed.data.targetWeight?.toString(),
    });
  }

  revalidatePath(`/sessions/${session.id}`);
  revalidatePath("/sessions");
  revalidatePath("/exercises");
  revalidatePath("/routines");
}

export async function updateWeightUnitAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = weightUnitSchema.safeParse({
    weightUnit: formData.get("weightUnit"),
  });

  if (!parsed.success) {
    throw new Error("Invalid weight unit payload");
  }

  const db = getDb();
  await db
    .insert(userPreferences)
    .values({
      userId,
      weightUnit: parsed.data.weightUnit,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        weightUnit: parsed.data.weightUnit,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  revalidatePath("/sessions");
  revalidatePath("/routines");
}

export async function setExerciseGifOverrideAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = setExerciseGifOverrideSchema.safeParse({
    sessionId: formData.get("sessionId"),
    exerciseId: formData.get("exerciseId"),
    gifUrl: formData.get("gifUrl"),
    sourceExerciseId: formData.get("sourceExerciseId") || undefined,
    sourceName: formData.get("sourceName") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid exercise GIF override payload");
  }

  const db = getDb();
  const [session] = await db
    .select({
      id: workoutSessions.id,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, parsed.data.sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);

  if (!session) {
    throw new Error("Workout session not found");
  }

  const [exercise] = await db
    .select({
      id: exercises.id,
    })
    .from(exercises)
    .where(eq(exercises.id, parsed.data.exerciseId))
    .limit(1);

  if (!exercise) {
    throw new Error("Exercise not found");
  }

  await db
    .insert(exerciseGifOverrides)
    .values({
      userId,
      exerciseId: parsed.data.exerciseId,
      gifUrl: parsed.data.gifUrl,
      sourceExerciseId: parsed.data.sourceExerciseId,
      sourceName: parsed.data.sourceName,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [exerciseGifOverrides.userId, exerciseGifOverrides.exerciseId],
      set: {
        gifUrl: parsed.data.gifUrl,
        sourceExerciseId: parsed.data.sourceExerciseId,
        sourceName: parsed.data.sourceName,
        updatedAt: new Date(),
      },
    });

  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  revalidatePath("/sessions");
}

export async function sendFriendRequestAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = sendFriendRequestSchema.safeParse({
    username: formData.get("username"),
  });

  if (!parsed.success) {
    throw new Error("Invalid friend request payload");
  }

  const db = getDb();
  const [targetUser] = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);

  if (!targetUser) {
    throw new Error("User not found");
  }

  if (targetUser.id === userId) {
    throw new Error("You cannot add yourself");
  }

  const existingRows = await db
    .select({
      id: friendRequests.id,
      requesterId: friendRequests.requesterId,
      addresseeId: friendRequests.addresseeId,
      status: friendRequests.status,
    })
    .from(friendRequests)
    .where(
      or(
        and(eq(friendRequests.requesterId, userId), eq(friendRequests.addresseeId, targetUser.id)),
        and(eq(friendRequests.requesterId, targetUser.id), eq(friendRequests.addresseeId, userId)),
      ),
    );

  if (existingRows.some((row) => row.status === "accepted")) {
    revalidatePath("/friends");
    return;
  }

  const incomingPending = existingRows.find(
    (row) =>
      row.requesterId === targetUser.id && row.addresseeId === userId && row.status === "pending",
  );
  if (incomingPending) {
    await db
      .update(friendRequests)
      .set({
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(friendRequests.id, incomingPending.id));

    revalidatePath("/friends");
    return;
  }

  const outgoingPending = existingRows.find(
    (row) =>
      row.requesterId === userId && row.addresseeId === targetUser.id && row.status === "pending",
  );
  if (outgoingPending) {
    throw new Error("Friend request already sent");
  }

  const outgoingRejected = existingRows.find(
    (row) =>
      row.requesterId === userId && row.addresseeId === targetUser.id && row.status === "rejected",
  );
  if (outgoingRejected) {
    await db
      .update(friendRequests)
      .set({
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(friendRequests.id, outgoingRejected.id));

    revalidatePath("/friends");
    return;
  }

  await db.insert(friendRequests).values({
    requesterId: userId,
    addresseeId: targetUser.id,
    status: "pending",
  });

  revalidatePath("/friends");
}

export async function acceptFriendRequestAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = friendRequestDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid friend request decision payload");
  }

  const db = getDb();
  const [request] = await db
    .select({
      id: friendRequests.id,
    })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.id, parsed.data.requestId),
        eq(friendRequests.addresseeId, userId),
        eq(friendRequests.status, "pending"),
      ),
    )
    .limit(1);

  if (!request) {
    throw new Error("Friend request not found");
  }

  await db
    .update(friendRequests)
    .set({
      status: "accepted",
      updatedAt: new Date(),
    })
    .where(eq(friendRequests.id, request.id));

  revalidatePath("/friends");
}

export async function rejectFriendRequestAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = friendRequestDecisionSchema.safeParse({
    requestId: formData.get("requestId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid friend request decision payload");
  }

  const db = getDb();
  const [request] = await db
    .select({
      id: friendRequests.id,
    })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.id, parsed.data.requestId),
        eq(friendRequests.addresseeId, userId),
        eq(friendRequests.status, "pending"),
      ),
    )
    .limit(1);

  if (!request) {
    throw new Error("Friend request not found");
  }

  await db
    .update(friendRequests)
    .set({
      status: "rejected",
      updatedAt: new Date(),
    })
    .where(eq(friendRequests.id, request.id));

  revalidatePath("/friends");
}

export async function removeFriendAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = removeFriendSchema.safeParse({
    friendUserId: formData.get("friendUserId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid remove friend payload");
  }

  const db = getDb();
  await db.delete(friendRequests).where(
    and(
      eq(friendRequests.status, "accepted"),
      or(
        and(eq(friendRequests.requesterId, userId), eq(friendRequests.addresseeId, parsed.data.friendUserId)),
        and(eq(friendRequests.requesterId, parsed.data.friendUserId), eq(friendRequests.addresseeId, userId)),
      ),
    ),
  );

  revalidatePath("/friends");
}

export async function startWorkoutSessionAction(formData: FormData) {
  const userId = await requireUserId();

  const parsed = startSessionSchema.safeParse({
    routineDayId: formData.get("routineDayId"),
    startedAtDate: formData.get("startedAtDate") || undefined,
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

  let startedAt = new Date();
  if (parsed.data.startedAtDate) {
    const [yearRaw, monthRaw, dayRaw] = parsed.data.startedAtDate.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const dayOfMonth = Number(dayRaw);
    const parsedDate = new Date(Date.UTC(year, month - 1, dayOfMonth, 12, 0, 0));
    if (!Number.isNaN(parsedDate.getTime())) {
      startedAt = parsedDate;
    }
  }

  await db.insert(workoutSessions).values({
    userId,
    routineId: day.routineId,
    routineDayId: parsed.data.routineDayId,
    startedAt,
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

export async function updateWorkoutSetAction(formData: FormData) {
  const userId = await requireUserId();
  const rawWeight = formData.get("weight");
  const parsed = updateSetSchema.safeParse({
    setId: formData.get("setId"),
    exerciseId: formData.get("exerciseId"),
    reps: Number(formData.get("reps")),
    weight:
      typeof rawWeight === "string" && rawWeight.trim() !== "" ? Number(rawWeight) : undefined,
    isWarmup: formData.get("isWarmup") === "on",
  });

  if (!parsed.success) {
    throw new Error("Invalid update workout set payload");
  }

  const db = getDb();
  const [ownedSet] = await db
    .select({
      id: workoutSets.id,
      sessionId: workoutSets.sessionId,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(and(eq(workoutSets.id, parsed.data.setId), eq(workoutSessions.userId, userId)))
    .limit(1);

  if (!ownedSet) {
    throw new Error("Workout set not found");
  }

  await db
    .update(workoutSets)
    .set({
      exerciseId: parsed.data.exerciseId,
      reps: parsed.data.reps,
      weight: parsed.data.weight?.toString(),
      isWarmup: parsed.data.isWarmup ?? false,
    })
    .where(eq(workoutSets.id, ownedSet.id));

  revalidatePath(`/sessions/${ownedSet.sessionId}`);
  revalidatePath("/sessions");
}

export async function deleteWorkoutSetAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = deleteSetSchema.safeParse({
    setId: formData.get("setId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid delete workout set payload");
  }

  const db = getDb();
  const [ownedSet] = await db
    .select({
      id: workoutSets.id,
      sessionId: workoutSets.sessionId,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(and(eq(workoutSets.id, parsed.data.setId), eq(workoutSessions.userId, userId)))
    .limit(1);

  if (!ownedSet) {
    throw new Error("Workout set not found");
  }

  await db.transaction(async (tx) => {
    await tx.delete(workoutSets).where(eq(workoutSets.id, ownedSet.id));

    const remaining = await tx
      .select({
        id: workoutSets.id,
      })
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, ownedSet.sessionId))
      .orderBy(asc(workoutSets.setOrder), asc(workoutSets.createdAt));

    for (let index = 0; index < remaining.length; index += 1) {
      await tx
        .update(workoutSets)
        .set({ setOrder: index + 1 })
        .where(eq(workoutSets.id, remaining[index].id));
    }
  });

  revalidatePath(`/sessions/${ownedSet.sessionId}`);
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

export async function cancelWorkoutSessionAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = cancelSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid cancel session payload");
  }

  const db = getDb();
  const [session] = await db
    .select({
      id: workoutSessions.id,
      status: workoutSessions.status,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, parsed.data.sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);

  if (!session) {
    throw new Error("Workout session not found");
  }

  if (session.status !== "active") {
    throw new Error("Only active sessions can be cancelled");
  }

  // Cancel is destructive by product decision: remove accidental sessions entirely.
  await db.delete(workoutSessions).where(eq(workoutSessions.id, session.id));

  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  redirect("/sessions");
}

export async function deleteWorkoutSessionAction(formData: FormData) {
  const userId = await requireUserId();
  const parsed = deleteSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid delete session payload");
  }

  const db = getDb();
  await db
    .delete(workoutSessions)
    .where(and(eq(workoutSessions.id, parsed.data.sessionId), eq(workoutSessions.userId, userId)));

  revalidatePath("/sessions");
  revalidatePath("/progress");
  revalidatePath("/dashboard");
  redirect("/sessions");
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
