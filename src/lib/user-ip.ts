import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userIpAddresses } from "@/db/schema";
import { extractClientIp } from "@/lib/request-ip";

export async function trackUserIp(userId: string, requestHeaders: Headers) {
  const ip = extractClientIp(requestHeaders);
  if (!ip) {
    return;
  }

  const userAgent = requestHeaders.get("user-agent")?.slice(0, 512) ?? null;
  const db = getDb();

  await db
    .insert(userIpAddresses)
    .values({
      userId,
      ipAddress: ip,
      lastUserAgent: userAgent,
    })
    .onConflictDoUpdate({
      target: [userIpAddresses.userId, userIpAddresses.ipAddress],
      set: {
        lastSeenAt: new Date(),
        hitCount: sql`${userIpAddresses.hitCount} + 1`,
        lastUserAgent: userAgent,
      },
    });
}
