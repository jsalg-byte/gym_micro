import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);
const optionalPublicBaseUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const envSchema = z.object({
  NEXTAUTH_URL: optionalUrl,
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MUSCLEWIKI_API_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),
  S3_PUBLIC_BASE_URL: optionalPublicBaseUrl,
  EXERCISE_DEMO_STORAGE_DRIVER: z.enum(["local", "s3", "r2"]).optional(),
  EXERCISE_DEMO_PUBLIC_BASE_URL: optionalPublicBaseUrl,
});

export const env = envSchema.parse(process.env);
