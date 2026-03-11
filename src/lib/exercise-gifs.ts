import { cache } from "react";

const FALLBACK_GIF = "https://cdn.exercisedb.dev/exercise.gif";
const EXERCISE_DB_BASE_URL = "https://www.exercisedb.dev";
const MAX_CANDIDATES = 12;

type ExerciseDbSearchResponse = {
  success?: boolean;
  data?: Array<{
    exerciseId?: string;
    name?: string;
    gifUrl?: string;
  }>;
};

export type ExerciseGifCandidate = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  score: number;
};

export type ExerciseGifResolution = {
  gifUrl: string;
  candidates: ExerciseGifCandidate[];
};

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string) {
  return normalizeText(input)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function scoreCandidate(query: string, candidateName: string) {
  const queryNormalized = normalizeText(query);
  const candidateNormalized = normalizeText(candidateName);

  if (!queryNormalized || !candidateNormalized) {
    return 0;
  }

  const queryTokens = new Set(tokenize(queryNormalized));
  const candidateTokens = new Set(tokenize(candidateNormalized));

  let overlap = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      overlap += 1;
    }
  }

  let score = overlap * 15;

  if (candidateNormalized === queryNormalized) {
    score += 120;
  } else if (candidateNormalized.includes(queryNormalized)) {
    score += 40;
  } else if (queryNormalized.includes(candidateNormalized)) {
    score += 20;
  }

  if (queryTokens.size > 0) {
    score += (overlap / queryTokens.size) * 35;
  }

  score -= Math.abs(candidateTokens.size - queryTokens.size) * 0.75;

  return score;
}

const fetchSearchCandidates = cache(async (query: string) => {
  const normalized = normalizeText(query);
  if (!normalized) {
    return [] as ExerciseGifCandidate[];
  }

  const url = new URL("/api/v1/exercises/search", EXERCISE_DB_BASE_URL);
  url.searchParams.set("q", normalized);
  url.searchParams.set("limit", "25");
  url.searchParams.set("offset", "0");
  url.searchParams.set("threshold", "0.35");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!response.ok) {
      return [] as ExerciseGifCandidate[];
    }

    const payload = (await response.json()) as ExerciseDbSearchResponse;
    const rows = payload.data ?? [];

    return rows
      .filter((row) => row.exerciseId && row.name && row.gifUrl)
      .map((row) => ({
        exerciseId: row.exerciseId as string,
        name: row.name as string,
        gifUrl: row.gifUrl as string,
        score: scoreCandidate(normalized, row.name as string),
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [] as ExerciseGifCandidate[];
  }
});

function buildSearchQueries(exerciseName: string) {
  const normalized = normalizeText(exerciseName);
  const tokens = tokenize(exerciseName);

  const firstTwo = tokens.slice(0, 2).join(" ").trim();
  const firstOne = tokens[0] ?? "";

  const queries = [normalized, firstTwo, firstOne].filter(Boolean);

  return Array.from(new Set(queries));
}

export const resolveExerciseGif = cache(async (exerciseName: string): Promise<ExerciseGifResolution> => {
  const queries = buildSearchQueries(exerciseName);
  if (queries.length === 0) {
    return { gifUrl: FALLBACK_GIF, candidates: [] };
  }

  const allCandidates = (
    await Promise.all(queries.map((query) => fetchSearchCandidates(query)))
  ).flat();

  const deduped = new Map<string, ExerciseGifCandidate>();
  for (const candidate of allCandidates) {
    const existing = deduped.get(candidate.exerciseId);
    if (!existing || candidate.score > existing.score) {
      deduped.set(candidate.exerciseId, candidate);
    }
  }

  const ranked = Array.from(deduped.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);

  return {
    gifUrl: ranked[0]?.gifUrl ?? FALLBACK_GIF,
    candidates: ranked,
  };
});
