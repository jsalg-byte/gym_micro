import { cache } from "react";

const FALLBACK_GIF = "https://cdn.exercisedb.dev/exercise.gif";
const EXERCISE_DB_BASE_URL = "https://www.exercisedb.dev";

type ExerciseDbSearchResponse = {
  success?: boolean;
  data?: Array<{
    name?: string;
    gifUrl?: string;
  }>;
};

const lookupGifByExerciseName = cache(async (exerciseName: string) => {
  const query = exerciseName.trim();
  if (!query) {
    return FALLBACK_GIF;
  }

  const url = new URL("/api/v1/exercises/search", EXERCISE_DB_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("offset", "0");
  url.searchParams.set("threshold", "0.15");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!response.ok) {
      return FALLBACK_GIF;
    }

    const payload = (await response.json()) as ExerciseDbSearchResponse;
    const gifUrl = payload.data?.[0]?.gifUrl;

    if (!gifUrl || typeof gifUrl !== "string") {
      return FALLBACK_GIF;
    }

    return gifUrl;
  } catch {
    return FALLBACK_GIF;
  }
});

export async function resolveExerciseGifUrl(exerciseName: string) {
  return lookupGifByExerciseName(exerciseName.toLowerCase());
}
