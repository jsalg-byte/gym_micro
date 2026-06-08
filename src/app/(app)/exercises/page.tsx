import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exerciseGifOverrides, exercises } from "@/db/schema";
import { ExercisesClient } from "@/components/exercises-client";
import {
  getExerciseDemoReview,
  resolveExerciseDemoPlayback,
  type ExerciseDemoReview,
} from "@/lib/exercise-gifs";
import { requireUserId } from "@/lib/session";

function parseDemoSourceMeta(sourceName: string | null) {
  if (!sourceName) {
    return null;
  }

  try {
    return JSON.parse(sourceName) as { start?: string; duration?: number };
  } catch {
    return null;
  }
}

function applyDemoSourceOverride(
  demo: ExerciseDemoReview,
  exerciseName: string,
  override?: {
    gifUrl: string;
    sourceExerciseId: string | null;
    sourceName: string | null;
  },
): ExerciseDemoReview {
  if (!override) {
    return demo;
  }

  const meta = parseDemoSourceMeta(override.sourceName);
  return {
    ...demo,
    seed: {
      ...(demo.seed ?? {
        name: exerciseName,
        slug: override.sourceExerciseId ?? demo.media.slug,
      }),
      youtubeUrl: override.gifUrl,
      approved: true,
      start: meta?.start,
      duration: meta?.duration,
      mediaType: "video",
    },
  };
}

export default async function ExercisesPage() {
  const userId = await requireUserId();
  const db = getDb();
  const items = await db.select().from(exercises).orderBy(asc(exercises.name));
  const itemIds = items.map((exercise) => exercise.id);
  const demoSourceOverrides =
    itemIds.length > 0
      ? await db
          .select({
            exerciseId: exerciseGifOverrides.exerciseId,
            gifUrl: exerciseGifOverrides.gifUrl,
            sourceExerciseId: exerciseGifOverrides.sourceExerciseId,
            sourceName: exerciseGifOverrides.sourceName,
          })
          .from(exerciseGifOverrides)
          .where(
            and(eq(exerciseGifOverrides.userId, userId), inArray(exerciseGifOverrides.exerciseId, itemIds)),
          )
      : [];
  const demoSourceOverrideByExerciseId = new Map(
    demoSourceOverrides.map((override) => [override.exerciseId, override]),
  );
  const itemsWithDemo = await Promise.all(
    items.map(async (exercise) => {
      const demo = applyDemoSourceOverride(
        getExerciseDemoReview(exercise.name),
        exercise.name,
        demoSourceOverrideByExerciseId.get(exercise.id),
      );

      return {
        ...exercise,
        demo: await resolveExerciseDemoPlayback(demo),
      };
    }),
  );

  return <ExercisesClient initialItems={itemsWithDemo} />;
}
