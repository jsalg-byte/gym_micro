import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

function required(value: string | undefined, key: string) {
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function createS3Client() {
  return new S3Client({
    endpoint: required(env.S3_ENDPOINT, "S3_ENDPOINT"),
    region: required(env.S3_REGION, "S3_REGION"),
    credentials: {
      accessKeyId: required(env.S3_ACCESS_KEY_ID, "S3_ACCESS_KEY_ID"),
      secretAccessKey: required(env.S3_SECRET_ACCESS_KEY, "S3_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  });
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function getPublicObjectUrl(params: { key: string; publicBaseUrl?: string | null }) {
  const baseUrl = params.publicBaseUrl ?? env.EXERCISE_DEMO_PUBLIC_BASE_URL ?? env.S3_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${encodeObjectKey(params.key)}`;
}

export async function putObject(params: {
  key: string;
  body: PutObjectCommandInput["Body"];
  contentType: string;
}) {
  const bucket = required(env.S3_BUCKET, "S3_BUCKET");
  const client = createS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}

export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  maxAgeSec?: number;
}) {
  const bucket = required(env.S3_BUCKET, "S3_BUCKET");
  const client = createS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: params.maxAgeSec ?? 300,
  });

  return {
    url,
    bucket,
    key: params.key,
  };
}

export async function createPresignedReadUrl(params: {
  key: string;
  maxAgeSec?: number;
}) {
  const bucket = required(env.S3_BUCKET, "S3_BUCKET");
  const client = createS3Client();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
  });

  return getSignedUrl(client, command, {
    expiresIn: params.maxAgeSec ?? 1800,
  });
}

export async function deleteObject(params: { key: string }) {
  const bucket = required(env.S3_BUCKET, "S3_BUCKET");
  const client = createS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: params.key,
    }),
  );
}
