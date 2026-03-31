import { cache } from "react";
import { env } from "@/lib/env";

const FALLBACK_GIF = "https://cdn.exercisedb.dev/exercise.gif";
const EXERCISE_DB_BASE_URL = "https://www.exercisedb.dev";
const MUSCLEWIKI_API_BASE_URL = "https://api.musclewiki.com";
const MAX_CANDIDATES = 12;

type ExerciseDbSearchResponse = {
  success?: boolean;
  data?: Array<{
    exerciseId?: string;
    name?: string;
    gifUrl?: string;
  }>;
};

type UnknownRecord = Record<string, unknown>;

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

function collectStringUrls(value: unknown, sink: string[], seen = new Set<unknown>()) {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      sink.push(value);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringUrls(item, sink, seen);
    }
    return;
  }

  for (const nested of Object.values(value as UnknownRecord)) {
    collectStringUrls(nested, sink, seen);
  }
}

function pickPreferredMediaUrl(row: UnknownRecord) {
  const urls: string[] = [];
  collectStringUrls(row, urls);

  const unique = Array.from(new Set(urls));
  if (unique.length === 0) {
    return null;
  }

  const preferredVideo = unique.find((url) => /\.(mp4|webm|mov|m4v|m3u8)(\?.*)?$/i.test(url));
  if (preferredVideo) {
    return preferredVideo;
  }

  const likelyVideo = unique.find((url) => /video|videos|media/i.test(url));
  if (likelyVideo) {
    return likelyVideo;
  }

  const gif = unique.find((url) => /\.gif(\?.*)?$/i.test(url));
  if (gif) {
    return gif;
  }

  return unique[0] ?? null;
}

function coerceRows(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return [] as UnknownRecord[];
  }
  if (Array.isArray(payload)) {
    return payload.filter((row): row is UnknownRecord => typeof row === "object" && row !== null);
  }

  const root = payload as UnknownRecord;
  const directArrays = [root.exercises, root.data, root.items, root.results];
  for (const entry of directArrays) {
    if (Array.isArray(entry)) {
      return entry.filter((row): row is UnknownRecord => typeof row === "object" && row !== null);
    }
  }

  if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
    const nested = root.data as UnknownRecord;
    const nestedArrays = [nested.exercises, nested.items, nested.results];
    for (const entry of nestedArrays) {
      if (Array.isArray(entry)) {
        return entry.filter((row): row is UnknownRecord => typeof row === "object" && row !== null);
      }
    }
  }

  return [];
}

const fetchMuscleWikiCandidates = cache(async (query: string) => {
  const normalized = normalizeText(query);
  if (!normalized || !env.MUSCLEWIKI_API_KEY) {
    return [] as ExerciseGifCandidate[];
  }

  const url = new URL("/exercises", MUSCLEWIKI_API_BASE_URL);
  url.searchParams.set("search", normalized);
  url.searchParams.set("limit", "30");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": env.MUSCLEWIKI_API_KEY,
      },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!response.ok) {
      return [] as ExerciseGifCandidate[];
    }

    const payload = (await response.json()) as unknown;
    const rows = coerceRows(payload);

    return rows
      .map((row) => {
        const name =
          (typeof row.name === "string" && row.name) ||
          (typeof row.exerciseName === "string" && row.exerciseName) ||
          (typeof row.title === "string" && row.title) ||
          (typeof row.slug === "string" && row.slug.replace(/-/g, " ")) ||
          "";

        const mediaUrl = pickPreferredMediaUrl(row);
        if (!name || !mediaUrl) {
          return null;
        }

        const exerciseId =
          (typeof row.id === "string" && row.id) ||
          (typeof row.exerciseId === "string" && row.exerciseId) ||
          (typeof row.slug === "string" && row.slug) ||
          normalizeText(name);

        return {
          exerciseId,
          name,
          gifUrl: mediaUrl,
          score: scoreCandidate(normalized, name),
        } satisfies ExerciseGifCandidate;
      })
      .filter((row): row is ExerciseGifCandidate => row !== null)
      .sort((a, b) => b.score - a.score);
  } catch {
    return [] as ExerciseGifCandidate[];
  }
});

const fetchExerciseDbCandidates = cache(async (query: string) => {
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

  const muscleWikiCandidates = (await Promise.all(queries.map((query) => fetchMuscleWikiCandidates(query)))).flat();
  const allCandidates =
    muscleWikiCandidates.length > 0
      ? muscleWikiCandidates
      : (await Promise.all(queries.map((query) => fetchExerciseDbCandidates(query)))).flat();

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
