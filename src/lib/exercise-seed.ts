import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises } from "@/db/schema";

type ExerciseSeed = {
  name: string;
  category: "strength" | "cardio" | "mobility";
  muscleGroup?: string;
};

const EXERCISE_LIBRARY_SEED: ExerciseSeed[] = [
  { name: "Barbell Back Squat", category: "strength", muscleGroup: "legs" },
  { name: "Front Squat", category: "strength", muscleGroup: "legs" },
  { name: "Deadlift", category: "strength", muscleGroup: "back" },
  { name: "Romanian Deadlift", category: "strength", muscleGroup: "hamstrings" },
  { name: "Leg Press", category: "strength", muscleGroup: "legs" },
  { name: "Walking Lunge", category: "strength", muscleGroup: "legs" },
  { name: "Barbell Bench Press", category: "strength", muscleGroup: "chest" },
  { name: "Incline Dumbbell Press", category: "strength", muscleGroup: "chest" },
  { name: "Dumbbell Fly", category: "strength", muscleGroup: "chest" },
  { name: "Standing Overhead Press", category: "strength", muscleGroup: "shoulders" },
  { name: "Seated Dumbbell Shoulder Press", category: "strength", muscleGroup: "shoulders" },
  { name: "Lateral Raise", category: "strength", muscleGroup: "shoulders" },
  { name: "Pull-Up", category: "strength", muscleGroup: "back" },
  { name: "Lat Pulldown", category: "strength", muscleGroup: "back" },
  { name: "Barbell Row", category: "strength", muscleGroup: "back" },
  { name: "Cable Seated Row", category: "strength", muscleGroup: "back" },
  { name: "Face Pull", category: "strength", muscleGroup: "rear delts" },
  { name: "EZ-Bar Curl", category: "strength", muscleGroup: "biceps" },
  { name: "Hammer Curl", category: "strength", muscleGroup: "biceps" },
  { name: "Cable Triceps Pressdown", category: "strength", muscleGroup: "triceps" },
  { name: "Overhead Triceps Extension", category: "strength", muscleGroup: "triceps" },
  { name: "Plank", category: "strength", muscleGroup: "core" },
  { name: "Treadmill Run", category: "cardio", muscleGroup: "full body" },
  { name: "Stationary Bike", category: "cardio", muscleGroup: "legs" },
  { name: "Rowing Machine", category: "cardio", muscleGroup: "full body" },
  { name: "Jump Rope", category: "cardio", muscleGroup: "full body" },
  { name: "Hip Flexor Stretch", category: "mobility", muscleGroup: "hips" },
  { name: "Thoracic Rotation", category: "mobility", muscleGroup: "spine" },
  { name: "World's Greatest Stretch", category: "mobility", muscleGroup: "full body" },
];

let seedInFlight: Promise<void> | null = null;

async function seedExerciseLibrary() {
  const db = getDb();
  const seedNames = EXERCISE_LIBRARY_SEED.map((exercise) => exercise.name);
  const existing = await db
    .select({ name: exercises.name })
    .from(exercises)
    .where(inArray(exercises.name, seedNames));

  const existingNames = new Set(existing.map((row) => row.name));
  const toInsert = EXERCISE_LIBRARY_SEED.filter((exercise) => !existingNames.has(exercise.name));

  if (toInsert.length === 0) {
    return;
  }

  await db.insert(exercises).values(
    toInsert.map((exercise) => ({
      name: exercise.name,
      category: exercise.category,
      muscleGroup: exercise.muscleGroup,
      createdByUserId: null,
    })),
  );
}

export async function ensureExerciseLibrarySeeded() {
  if (!seedInFlight) {
    seedInFlight = seedExerciseLibrary().catch((error) => {
      seedInFlight = null;
      throw error;
    });
  }

  await seedInFlight;
}
