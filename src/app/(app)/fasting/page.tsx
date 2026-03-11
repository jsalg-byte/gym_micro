import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { activeFasts, fastingLogs } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { FastingTracker } from "@/components/fasting-tracker";

export default async function FastingPage() {
  const userId = await requireUserId();
  const db = getDb();

  const [logs, activeFast] = await Promise.all([
    db
      .select({
        id: fastingLogs.id,
        startedAt: fastingLogs.startedAt,
        endedAt: fastingLogs.endedAt,
        durationMinutes: fastingLogs.durationMinutes,
        note: fastingLogs.note,
      })
      .from(fastingLogs)
      .where(eq(fastingLogs.userId, userId))
      .orderBy(desc(fastingLogs.endedAt))
      .limit(180),
    db
      .select({
        id: activeFasts.id,
        startedAt: activeFasts.startedAt,
        note: activeFasts.note,
      })
      .from(activeFasts)
      .where(eq(activeFasts.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return (
    <main>
      <FastingTracker
        initialActiveFast={
          activeFast
            ? {
                id: activeFast.id,
                startedAt: activeFast.startedAt.toISOString(),
                note: activeFast.note,
              }
            : null
        }
        entries={logs.map((entry) => ({
          id: entry.id,
          startedAt: entry.startedAt.toISOString(),
          endedAt: entry.endedAt.toISOString(),
          durationMinutes: entry.durationMinutes,
          note: entry.note,
        }))}
      />
    </main>
  );
}
