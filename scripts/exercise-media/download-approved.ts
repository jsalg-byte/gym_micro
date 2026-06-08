import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type MediaType = "video" | "external" | "none";

type ExerciseSeed = {
  name: string;
  slug: string;
  aliases?: string[];
  aliasOf?: string;
  youtubeUrl?: string;
  approved?: boolean;
  start?: string;
  duration?: number;
  mediaType?: MediaType;
  qualityNotes?: string;
};

type ManifestEntry = {
  name: string;
  slug: string;
  status: "downloaded" | "pending" | "skipped" | "failed" | "none";
  mediaType: MediaType;
  localPath: string | null;
  objectKey?: string | null;
  storage?: "local" | "s3" | "r2" | null;
  source: "youtube" | "alias" | null;
  sourceUrl: string | null;
  duration?: number;
  aliasOf?: string;
};

type Failure = {
  slug: string;
  name: string;
  youtubeUrl: string;
  error: string;
};

const SEED_PATH = "data/exercises.seed.json";
const LOCAL_SOURCES_PATH = "data/exercise-demo-sources.local.json";
const MANIFEST_PATH = "data/exercise-media.generated.json";
const FAILURES_PATH = "data/exercise-media-failures.generated.json";
const VIDEO_DIR = "public/exercises/videos";
const TEMP_DIR = ".tmp/exercise-downloads";
const DEMO_OBJECT_PREFIX = "exercise-demos";
const YTDLP_FORMAT = "bv*[height<=480]/b[height<=480]/bv*[height<=720]/b[height<=720]";
const DEFAULT_YTDLP_PLAYER_CLIENTS = ["web", "mweb", "android"];

type CommandInvocation = {
  command: string;
  args: string[];
  label: string;
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), filePath), "utf8")) as T;
}

function readOptionalJsonFile<T>(filePath: string, fallback: T): T {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) {
    return fallback;
  }

  return readJsonFile<T>(filePath);
}

function writeJsonFile(filePath: string, value: unknown) {
  const fullPath = resolve(process.cwd(), filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function readArgValue(name: string) {
  const prefix = `${name}=`;
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg === name) {
      return process.argv[index + 1] ?? null;
    }
    if (arg?.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }

  return null;
}

function required(value: string | undefined, key: string) {
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function demoStorageDriver(): "local" | "s3" | "r2" {
  const value = (process.env.EXERCISE_DEMO_STORAGE_DRIVER ?? "local").toLowerCase();
  if (value === "s3" || value === "r2") {
    return value;
  }

  return "local";
}

function createS3Client() {
  return new S3Client({
    endpoint: required(process.env.S3_ENDPOINT, "S3_ENDPOINT"),
    region: required(process.env.S3_REGION, "S3_REGION"),
    credentials: {
      accessKeyId: required(process.env.S3_ACCESS_KEY_ID, "S3_ACCESS_KEY_ID"),
      secretAccessKey: required(process.env.S3_SECRET_ACCESS_KEY, "S3_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function demoObjectKey(slug: string) {
  return `${DEMO_OBJECT_PREFIX}/${slug}.mp4`;
}

function publicDemoUrl(key: string) {
  const baseUrl = process.env.EXERCISE_DEMO_PUBLIC_BASE_URL ?? process.env.S3_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${encodeObjectKey(key)}`;
}

async function uploadDemoToObjectStorage(finalPath: string, slug: string) {
  const key = demoObjectKey(slug);
  const client = createS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: required(process.env.S3_BUCKET, "S3_BUCKET"),
      Key: key,
      Body: readFileSync(finalPath),
      ContentType: "video/mp4",
    }),
  );

  return {
    key,
    url: publicDemoUrl(key),
  };
}

function commandExists(command: string, args: string[]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0;
}

function checkCommand(invocation: CommandInvocation, args: string[]) {
  return spawnSync(invocation.command, [...invocation.args, ...args], { encoding: "utf8", stdio: "pipe" });
}

function getYtDlpInvocation(): CommandInvocation {
  if (process.env.YTDLP_COMMAND) {
    return {
      command: process.env.YTDLP_COMMAND,
      args: [],
      label: process.env.YTDLP_COMMAND,
    };
  }

  const pythonCandidates = [
    process.env.YTDLP_PYTHON,
    resolve(process.cwd(), ".venv-ytdlp/bin/python"),
    "python3",
  ].filter(Boolean) as string[];

  for (const pythonCommand of pythonCandidates) {
    const pythonModule = {
      command: pythonCommand,
      args: ["-m", "yt_dlp"],
      label: `${pythonCommand} -m yt_dlp`,
    };

    if (checkCommand(pythonModule, ["--version"]).status === 0) {
      return pythonModule;
    }
  }

  return {
    command: "yt-dlp",
    args: [],
    label: "yt-dlp",
  };
}

function getInstallHint() {
  if (existsSync(resolve(process.cwd(), "nixpacks.toml"))) {
    return "Coolify should install yt-dlp through the .venv-ytdlp Nixpacks step.";
  }

  return "Install them on macOS with: brew install yt-dlp ffmpeg";
}

function preflight() {
  const ytDlp = getYtDlpInvocation();
  const checks: Array<[string, () => boolean]> = [
    [ytDlp.label, () => checkCommand(ytDlp, ["--version"]).status === 0],
    ["ffmpeg", () => commandExists("ffmpeg", ["-version"])],
    ["ffprobe", () => commandExists("ffprobe", ["-version"])],
  ];
  const missing = checks.filter(([, check]) => !check());

  if (missing.length > 0) {
    console.error(`Missing required tools: ${missing.map(([command]) => command).join(", ")}`);
    console.error(getInstallHint());
    process.exit(1);
  }

  const ytDlpVersion = checkCommand(ytDlp, ["--version"]).stdout.trim();
  if (ytDlpVersion) {
    console.log(`yt-dlp command: ${ytDlp.label}`);
    console.log(`yt-dlp version: ${ytDlpVersion}`);
  }
}

function isDownloadable(exercise: ExerciseSeed) {
  return (exercise.mediaType ?? "video") === "video" && exercise.approved === true && !!exercise.youtubeUrl;
}

function findDownloadedTemp(slug: string) {
  const commonExtensions = [".mp4", ".webm", ".mkv", ".mov", ".m4v"];
  for (const extension of commonExtensions) {
    const fullPath = resolve(process.cwd(), TEMP_DIR, `${slug}${extension}`);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function getYtDlpPlayerClients() {
  return (process.env.YTDLP_PLAYER_CLIENTS ?? DEFAULT_YTDLP_PLAYER_CLIENTS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getYtDlpCookieArgs() {
  return process.env.YTDLP_COOKIES ? ["--cookies", process.env.YTDLP_COOKIES] : [];
}

function getYtDlpAttempts() {
  const playerClients = getYtDlpPlayerClients();
  const cookieArgs = getYtDlpCookieArgs();
  const attempts: Array<{ label: string; args: string[] }> = [];

  if (cookieArgs.length > 0) {
    attempts.push({ label: "cookies/default", args: cookieArgs });
    for (const client of playerClients) {
      attempts.push({
        label: `cookies/player_client=${client}`,
        args: [...cookieArgs, "--extractor-args", `youtube:player_client=${client}`],
      });
    }
  }

  attempts.push({ label: "default", args: [] });
  for (const client of playerClients) {
    attempts.push({
      label: `player_client=${client}`,
      args: ["--extractor-args", `youtube:player_client=${client}`],
    });
  }

  return attempts;
}

function runYtDlpAttempt(exercise: ExerciseSeed, attempt: { label: string; args: string[] }) {
  const ytDlp = getYtDlpInvocation();
  const outputTemplate = resolve(process.cwd(), TEMP_DIR, `${exercise.slug}.%(ext)s`);
  const args = [
    ...attempt.args,
    "-f",
    YTDLP_FORMAT,
    "--merge-output-format",
    "mp4",
    "-o",
    outputTemplate,
    exercise.youtubeUrl as string,
  ];

  const result = spawnSync(ytDlp.command, [...ytDlp.args, ...args], { encoding: "utf8", stdio: "pipe" });
  return {
    ok: result.status === 0,
    error: result.status === 0
      ? null
      : `[${attempt.label}] exit ${result.status ?? 1}: ${result.stderr || result.stdout}`,
  };
}

function runYtDlp(exercise: ExerciseSeed) {
  const errors: string[] = [];
  for (const attempt of getYtDlpAttempts()) {
    const result = runYtDlpAttempt(exercise, attempt);
    if (result.ok) {
      if (errors.length > 0) {
        console.log(`yt-dlp succeeded for ${exercise.slug} using ${attempt.label}`);
      }
      return;
    }

    errors.push(result.error ?? `[${attempt.label}] failed`);
  }

  throw new Error(`yt-dlp failed after ${errors.length} attempt(s):\n${errors.join("\n")}`);
}

function runFfmpeg(inputPath: string, exercise: ExerciseSeed, finalPath: string, force: boolean) {
  const args = [
    ...(force ? ["-y"] : ["-n"]),
    ...(exercise.start ? ["-ss", exercise.start] : []),
    "-i",
    inputPath,
    ...(exercise.duration ? ["-t", String(exercise.duration)] : []),
    "-an",
    "-movflags",
    "+faststart",
    "-pix_fmt",
    "yuv420p",
    finalPath,
  ];

  const result = spawnSync("ffmpeg", args, { encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status ?? 1}: ${result.stderr || result.stdout}`);
  }
}

function removeTempInput(inputPath: string | null) {
  if (!inputPath || !inputPath.startsWith(resolve(process.cwd(), TEMP_DIR))) {
    return;
  }

  try {
    unlinkSync(inputPath);
  } catch {
    // Best effort cleanup only.
  }
}

function localVideoPath(slug: string) {
  return `/exercises/videos/${slug}.mp4`;
}

function finalVideoPath(slug: string) {
  return resolve(process.cwd(), VIDEO_DIR, `${slug}.mp4`);
}

async function downloadedManifestEntry(params: {
  exercise: ExerciseSeed;
  mediaType: MediaType;
  finalPath: string;
  previousEntry?: ManifestEntry;
  reuseExistingUpload?: boolean;
}) {
  const storageDriver = demoStorageDriver();

  if (storageDriver === "local") {
    return {
      name: params.exercise.name,
      slug: params.exercise.slug,
      status: "downloaded" as const,
      mediaType: params.mediaType,
      localPath: localVideoPath(params.exercise.slug),
      objectKey: null,
      storage: "local" as const,
      source: "youtube" as const,
      sourceUrl: params.exercise.youtubeUrl || null,
      duration: params.exercise.duration,
    };
  }

  const canonicalKey = demoObjectKey(params.exercise.slug);
  const previousObjectKey = params.previousEntry?.objectKey;
  const upload = params.reuseExistingUpload && previousObjectKey === canonicalKey
    ? { key: previousObjectKey, url: publicDemoUrl(previousObjectKey) }
    : await uploadDemoToObjectStorage(params.finalPath, params.exercise.slug);

  return {
    name: params.exercise.name,
    slug: params.exercise.slug,
    status: "downloaded" as const,
    mediaType: params.mediaType,
    localPath: upload.url,
    objectKey: upload.key,
    storage: storageDriver,
    source: "youtube" as const,
    sourceUrl: params.exercise.youtubeUrl || null,
    duration: params.exercise.duration,
  };
}

async function main() {
  const force = process.argv.includes("--force");
  const targetSlug = readArgValue("--slug");
  const localSources = readOptionalJsonFile<Record<string, ExerciseSeed>>(LOCAL_SOURCES_PATH, {});
  const seededExercises = readJsonFile<ExerciseSeed[]>(SEED_PATH);
  const previousManifest = readOptionalJsonFile<Record<string, ManifestEntry>>(MANIFEST_PATH, {});
  const seededSlugs = new Set(seededExercises.map((exercise) => exercise.slug));
  const exercises = seededExercises.map((exercise) => {
    const localSource = localSources[exercise.slug];
    if (!localSource) {
      return exercise;
    }

    return {
      ...exercise,
      ...localSource,
      duration: localSource.duration,
    };
  }).concat(Object.values(localSources).filter((exercise) => !seededSlugs.has(exercise.slug)));
  const manifest: Record<string, ManifestEntry> = {};
  const failures: Failure[] = [];
  const stats = {
    downloaded: 0,
    skippedExisting: 0,
    skippedUnapproved: 0,
    skippedNone: 0,
    failed: 0,
  };

  mkdirSync(resolve(process.cwd(), VIDEO_DIR), { recursive: true });
  mkdirSync(resolve(process.cwd(), TEMP_DIR), { recursive: true });

  if (targetSlug && !exercises.some((exercise) => exercise.slug === targetSlug)) {
    console.error(`Exercise demo target not found: ${targetSlug}`);
    process.exit(1);
  }

  const downloadable = exercises.filter((exercise) => {
    if (targetSlug && exercise.slug !== targetSlug) {
      return false;
    }

    return isDownloadable(exercise);
  });
  if (downloadable.length > 0) {
    preflight();
  }

  for (const exercise of exercises) {
    const mediaType = exercise.mediaType ?? "video";

    if (targetSlug && exercise.slug !== targetSlug) {
      const previousEntry = previousManifest[exercise.slug];
      if (previousEntry) {
        manifest[exercise.slug] = previousEntry;
        continue;
      }
    }

    if (mediaType === "none") {
      manifest[exercise.slug] = {
        name: exercise.name,
        slug: exercise.slug,
        status: "none",
        mediaType,
        localPath: null,
        objectKey: null,
        storage: null,
        source: null,
        sourceUrl: null,
      };
      stats.skippedNone += 1;
      continue;
    }

    if (exercise.aliasOf) {
      manifest[exercise.slug] = {
        name: exercise.name,
        slug: exercise.slug,
        status: "pending",
        mediaType,
        localPath: null,
        objectKey: null,
        storage: null,
        source: "alias",
        sourceUrl: null,
        duration: exercise.duration,
        aliasOf: exercise.aliasOf,
      };
      continue;
    }

    const finalPath = finalVideoPath(exercise.slug);
    if (existsSync(finalPath) && !force) {
      manifest[exercise.slug] = await downloadedManifestEntry({
        exercise,
        mediaType,
        finalPath,
        previousEntry: previousManifest[exercise.slug],
        reuseExistingUpload: true,
      });
      stats.skippedExisting += 1;
      continue;
    }

    if (!isDownloadable(exercise)) {
      manifest[exercise.slug] = {
        name: exercise.name,
        slug: exercise.slug,
        status: "pending",
        mediaType,
        localPath: null,
        objectKey: null,
        storage: null,
        source: null,
        sourceUrl: exercise.youtubeUrl || null,
        duration: exercise.duration,
      };
      stats.skippedUnapproved += 1;
      continue;
    }

    let tempInput: string | null = null;
    try {
      const staleTemp = findDownloadedTemp(exercise.slug);
      if (staleTemp) {
        removeTempInput(staleTemp);
      }

      runYtDlp(exercise);
      tempInput = findDownloadedTemp(exercise.slug);
      if (!tempInput) {
        throw new Error(`yt-dlp did not create a recognizable media file for ${exercise.slug}`);
      }

      if (extname(tempInput).toLowerCase() === ".mp4" && force && existsSync(finalPath)) {
        unlinkSync(finalPath);
      }

      runFfmpeg(tempInput, exercise, finalPath, force);
      manifest[exercise.slug] = await downloadedManifestEntry({
        exercise,
        mediaType,
        finalPath,
      });
      stats.downloaded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      manifest[exercise.slug] = {
        name: exercise.name,
        slug: exercise.slug,
        status: "failed",
        mediaType,
        localPath: null,
        objectKey: null,
        storage: null,
        source: "youtube",
        sourceUrl: exercise.youtubeUrl || null,
        duration: exercise.duration,
      };
      failures.push({
        slug: exercise.slug,
        name: exercise.name,
        youtubeUrl: exercise.youtubeUrl ?? "",
        error: message,
      });
      stats.failed += 1;
    } finally {
      removeTempInput(tempInput);
    }
  }

  for (const exercise of exercises) {
    const entry = manifest[exercise.slug];
    if (!entry?.aliasOf) {
      continue;
    }

    const target = manifest[entry.aliasOf];
    if ((target?.localPath || target?.objectKey) && target.status === "downloaded") {
      manifest[exercise.slug] = {
        ...entry,
        status: "downloaded",
        localPath: target.localPath,
        objectKey: target.objectKey ?? null,
        storage: target.storage ?? null,
        sourceUrl: target.sourceUrl,
      };
    }
  }

  writeJsonFile(MANIFEST_PATH, manifest);
  if (failures.length > 0) {
    writeJsonFile(FAILURES_PATH, failures);
  } else if (existsSync(resolve(process.cwd(), FAILURES_PATH))) {
    unlinkSync(resolve(process.cwd(), FAILURES_PATH));
  }

  console.log(`Downloaded: ${stats.downloaded}`);
  console.log(`Skipped existing: ${stats.skippedExisting}`);
  console.log(`Skipped unapproved: ${stats.skippedUnapproved}`);
  console.log(`Skipped none: ${stats.skippedNone}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Manifest written: ${MANIFEST_PATH}`);
  if (failures.length > 0) {
    console.log("Failure details:");
    for (const failure of failures) {
      console.log(`- ${failure.slug}: ${failure.error}`);
    }
    console.log(`Failures written: ${FAILURES_PATH}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
