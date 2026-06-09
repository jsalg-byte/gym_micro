import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import exerciseCandidatesJson from "../../data/exercise-candidates.generated.json";
import exerciseSeedJson from "../../data/exercises.seed.json";
import { createPresignedReadUrl, getPublicObjectUrl, objectExists } from "@/lib/storage";

export type ExerciseGifCandidate = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  score: number;
};

export type ExerciseMediaManifestEntry = {
  name: string;
  slug: string;
  status: "downloaded" | "external" | "pending" | "skipped" | "failed" | "none";
  mediaType: "video" | "external" | "none";
  localPath: string | null;
  objectKey?: string | null;
  storage?: "local" | "s3" | "r2" | null;
  source: "youtube" | "alias" | null;
  sourceUrl: string | null;
  duration?: number;
  aliasOf?: string;
};

export type ExerciseDemoQuery = {
  label: string;
  query: string;
  url: string;
};

export type ExerciseDemoSeedEntry = {
  name: string;
  slug: string;
  aliases?: string[];
  aliasOf?: string;
  searchQuery?: string;
  youtubeUrl?: string;
  approved?: boolean;
  start?: string;
  duration?: number;
  mediaType?: "video" | "external" | "none";
  qualityNotes?: string;
};

export type ExerciseDemoReview = {
  media: ExerciseMediaManifestEntry;
  seed: ExerciseDemoSeedEntry | null;
  queries: ExerciseDemoQuery[];
};

export type ExerciseGifResolution = {
  gifUrl: string | null;
  candidates: ExerciseGifCandidate[];
  media: ExerciseMediaManifestEntry;
};

type ExerciseCandidateEntry = {
  name: string;
  slug: string;
  aliasOf?: string;
  mediaType?: "video" | "external" | "none";
  queries?: ExerciseDemoQuery[];
};

const EXERCISE_MANIFEST_PATH = "data/exercise-media.generated.json";
const EXERCISE_DEMO_OBJECT_PREFIX = "exercise-demos";
const exerciseCandidates = exerciseCandidatesJson as Record<string, ExerciseCandidateEntry>;
const exerciseSeed = exerciseSeedJson as ExerciseDemoSeedEntry[];

function readExerciseManifest() {
  try {
    return JSON.parse(
      readFileSync(resolve(process.cwd(), EXERCISE_MANIFEST_PATH), "utf8"),
    ) as Record<string, ExerciseMediaManifestEntry>;
  } catch (error) {
    console.warn("Could not read exercise media manifest:", error);
    return {};
  }
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(input: string) {
  return normalizeText(input).replace(/\s+/g, "-");
}

function demoObjectKey(slug: string) {
  return `${EXERCISE_DEMO_OBJECT_PREFIX}/${slug}.mp4`;
}

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query).replace(/%20/g, "+")}`;
}

function fallbackQueries(exerciseName: string): ExerciseDemoQuery[] {
  const base = exerciseName.toLowerCase();
  const preferred = `the perfect ${base}`;
  return [
    { label: "preferred", query: preferred, url: youtubeSearchUrl(preferred) },
    { label: "form", query: `${base} exercise form`, url: youtubeSearchUrl(`${base} exercise form`) },
    { label: "proper-form", query: `${base} proper form`, url: youtubeSearchUrl(`${base} proper form`) },
    { label: "demo", query: `${base} demo`, url: youtubeSearchUrl(`${base} demo`) },
    { label: "shorts", query: `${base} shorts`, url: youtubeSearchUrl(`${base} shorts`) },
  ];
}

const slugByName = new Map<string, string>();
for (const exercise of exerciseSeed) {
  slugByName.set(normalizeText(exercise.name), exercise.slug);
  for (const alias of exercise.aliases ?? []) {
    slugByName.set(normalizeText(alias), exercise.slug);
  }
}

function getPendingEntry(exerciseName: string): ExerciseMediaManifestEntry {
  const slug = slugByName.get(normalizeText(exerciseName)) ?? slugify(exerciseName);
  const seed = exerciseSeed.find((exercise) => exercise.slug === slug);

  return {
    name: seed?.name ?? exerciseName,
    slug,
    status: seed?.mediaType === "none" ? "none" : "pending",
    mediaType: seed?.mediaType ?? "video",
    localPath: null,
    source: null,
    sourceUrl: null,
    aliasOf: seed?.aliasOf,
  };
}

export function resolveExerciseMedia(exerciseName: string): ExerciseMediaManifestEntry {
  const exerciseManifest = readExerciseManifest();
  const slug = slugByName.get(normalizeText(exerciseName)) ?? slugify(exerciseName);
  const entry = exerciseManifest[slug];
  if (!entry) {
    return getPendingEntry(exerciseName);
  }

  if (entry.aliasOf) {
    const target = exerciseManifest[entry.aliasOf];
    if (target?.localPath || target?.objectKey) {
      return {
        ...entry,
        status: target.status,
        localPath: target.localPath,
        objectKey: target.objectKey ?? null,
        storage: target.storage ?? null,
        sourceUrl: target.sourceUrl,
      };
    }
  }

  return entry;
}

export function getExerciseDemoReview(exerciseName: string): ExerciseDemoReview {
  const slug = slugByName.get(normalizeText(exerciseName)) ?? slugify(exerciseName);
  const seed = exerciseSeed.find((exercise) => exercise.slug === slug) ?? null;
  const candidate = exerciseCandidates[slug];

  return {
    media: resolveExerciseMedia(exerciseName),
    seed,
    queries: candidate?.queries?.length ? candidate.queries : fallbackQueries(seed?.name ?? exerciseName),
  };
}

export async function resolveExerciseDemoPlayback(demo: ExerciseDemoReview): Promise<ExerciseDemoReview> {
  if (demo.media.localPath) {
    return demo;
  }

  const externalSourceUrl = demo.seed?.approved && demo.seed.youtubeUrl
    ? demo.seed.youtubeUrl
    : demo.media.sourceUrl;

  let objectKey = demo.media.objectKey ?? null;
  if (!objectKey && demo.seed?.approved && demo.seed.youtubeUrl && demo.media.mediaType === "video") {
    const candidateKey = demoObjectKey(demo.media.slug);
    try {
      objectKey = (await objectExists({ key: candidateKey })) ? candidateKey : null;
    } catch (error) {
      console.warn("Could not check exercise demo object:", { key: candidateKey, error });
    }
  }

  if (!objectKey || (demo.media.status !== "downloaded" && objectKey !== demoObjectKey(demo.media.slug))) {
    if (externalSourceUrl && demo.media.mediaType !== "none") {
      return {
        ...demo,
        media: {
          ...demo.media,
          status: "external",
          mediaType: "external",
          localPath: externalSourceUrl,
          source: "youtube",
          sourceUrl: externalSourceUrl,
        },
      };
    }

    return demo;
  }

  const publicUrl = getPublicObjectUrl({ key: objectKey });
  if (publicUrl) {
    return {
      ...demo,
      media: {
        ...demo.media,
        status: "downloaded",
        localPath: publicUrl,
        objectKey,
        storage: demo.media.storage ?? "r2",
      },
    };
  }

  try {
    return {
      ...demo,
      media: {
        ...demo.media,
        status: "downloaded",
        localPath: await createPresignedReadUrl({
          key: objectKey,
          maxAgeSec: 60 * 60 * 6,
        }),
        objectKey,
        storage: demo.media.storage ?? "r2",
      },
    };
  } catch (error) {
    console.warn("Could not create exercise demo read URL:", error);
    return demo;
  }
}

export async function resolveExerciseGif(exerciseName: string): Promise<ExerciseGifResolution> {
  const demo = await resolveExerciseDemoPlayback({
    media: resolveExerciseMedia(exerciseName),
    seed: null,
    queries: [],
  });

  return {
    gifUrl: demo.media.localPath,
    candidates: [],
    media: demo.media,
  };
}
