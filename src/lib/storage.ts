import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
