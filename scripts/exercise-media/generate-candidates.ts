import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type ExerciseSeed = {
  name: string;
  slug: string;
  aliases?: string[];
  aliasOf?: string;
  searchQuery?: string;
  mediaType?: "video" | "external" | "none";
};

type CandidateQuery = {
  label: string;
  query: string;
  url: string;
};

type SearchResult = {
  title?: string;
  url?: string;
  duration?: number;
  uploader?: string;
};

const SEED_PATH = "data/exercises.seed.json";
const OUTPUT_PATH = "data/exercise-candidates.generated.json";

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), filePath), "utf8")) as T;
}

function writeJsonFile(filePath: string, value: unknown) {
  const fullPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query).replace(
    /%20/g,
    "+",
  )}`;
}

function buildQueries(exercise: ExerciseSeed): CandidateQuery[] {
  const preferredQuery = exercise.searchQuery?.trim() || `the perfect ${exercise.name.toLowerCase()}`;
  const base = exercise.name.toLowerCase();
  const queries = [
    { label: "preferred", query: preferredQuery },
    { label: "form", query: `${base} exercise form` },
    { label: "proper-form", query: `${base} proper form` },
    { label: "demo", query: `${base} demo` },
    { label: "shorts", query: `${base} shorts` },
  ];

  const seen = new Set<string>();
  return queries
    .filter((entry) => {
      const key = entry.query.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((entry) => ({
      ...entry,
      url: youtubeSearchUrl(entry.query),
    }));
}

function getYtDlpSearchResults(query: string) {
  const result = spawnSync("yt-dlp", [`ytsearch5:${query}`, "--dump-json"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return [] as SearchResult[];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const row = JSON.parse(line) as Record<string, unknown>;
        const result: SearchResult = {
          title: typeof row.title === "string" ? row.title : undefined,
          url: typeof row.webpage_url === "string" ? row.webpage_url : undefined,
          duration: typeof row.duration === "number" ? row.duration : undefined,
          uploader: typeof row.uploader === "string" ? row.uploader : undefined,
        };
        return result;
      } catch {
        return null;
      }
    })
    .filter((row): row is SearchResult => row !== null);
}

function main() {
  const useYtDlpSearch = process.argv.includes("--yt-dlp-search");
  if (!existsSync(resolve(process.cwd(), SEED_PATH))) {
    throw new Error(`${SEED_PATH} does not exist`);
  }

  const exercises = readJsonFile<ExerciseSeed[]>(SEED_PATH);
  const candidates: Record<string, unknown> = {};

  for (const exercise of exercises) {
    const queries = buildQueries(exercise);
    candidates[exercise.slug] = {
      name: exercise.name,
      slug: exercise.slug,
      aliasOf: exercise.aliasOf,
      mediaType: exercise.mediaType ?? "video",
      queries,
      ...(useYtDlpSearch && exercise.mediaType !== "none"
        ? { results: getYtDlpSearchResults(queries[0].query) }
        : {}),
    };
  }

  writeJsonFile(OUTPUT_PATH, candidates);
  console.log(`Wrote ${OUTPUT_PATH} for ${exercises.length} exercises.`);
  console.log("Review the generated search URLs, then set youtubeUrl and approved=true in data/exercises.seed.json.");
}

main();
