import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { routineDays, routines, uploads, workoutSessions, workoutSets } from "@/db/schema";
import { ProgressCalendar } from "@/components/progress-calendar";
import { ProgressPhotoForm } from "@/components/progress-photo-form";
import { createPresignedReadUrl } from "@/lib/storage";
import { requireUserId } from "@/lib/session";

export default async function ProgressPage() {
  const userId = await requireUserId();
  const db = getDb();

  const [records, sessions] = await Promise.all([
    db
      .select()
      .from(uploads)
      .where(and(eq(uploads.userId, userId), eq(uploads.entityType, "progress_photo")))
      .orderBy(desc(uploads.capturedAt))
      .limit(60),
    db
      .select({
        id: workoutSessions.id,
        startedAt: workoutSessions.startedAt,
        status: workoutSessions.status,
        routineName: routines.name,
        dayName: routineDays.dayName,
      })
      .from(workoutSessions)
      .leftJoin(routines, eq(workoutSessions.routineId, routines.id))
      .leftJoin(routineDays, eq(workoutSessions.routineDayId, routineDays.id))
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(60),
  ]);

  const calendarEntries = await Promise.all(
    records.map(async (record) => ({
      id: record.id,
      objectKey: record.objectKey,
      note: record.note,
      capturedAt: record.capturedAt.toISOString(),
      imageUrl: await createPresignedReadUrl({
        key: record.objectKey,
      }),
    })),
  );

  const sessionIds = sessions.map((session) => session.id);
  const setCounts =
    sessionIds.length > 0
      ? await db
          .select({
            sessionId: workoutSets.sessionId,
            setCount: count(),
          })
          .from(workoutSets)
          .where(inArray(workoutSets.sessionId, sessionIds))
          .groupBy(workoutSets.sessionId)
      : [];
  const setCountBySessionId = new Map(setCounts.map((row) => [row.sessionId, row.setCount]));

  const sessionCalendarEntries = sessions.map((session) => ({
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    status: session.status,
    routineName: session.routineName,
    dayName: session.dayName,
    setCount: setCountBySessionId.get(session.id) ?? 0,
  }));

  return (
    <main className="grid gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
      <ProgressPhotoForm />
      <ProgressCalendar entries={calendarEntries} sessionEntries={sessionCalendarEntries} />
    </main>
  );
}
