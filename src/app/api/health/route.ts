import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getRedis } from "@/lib/redis";

export async function GET() {
  const db = getDb();
  const redis = getRedis();

  let dbOk = false;
  let redisOk = false;

  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }

  if (redis) {
    try {
      redisOk = (await redis.ping()) === "PONG";
    } catch {
      redisOk = false;
    }
  } else {
    redisOk = true;
  }

  const healthy = dbOk && redisOk;
  const status = healthy ? 200 : 503;

  return NextResponse.json(
    {
      ok: healthy,
      checks: {
        db: dbOk,
        redis: redisOk,
      },
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}
