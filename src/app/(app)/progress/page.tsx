import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { ProgressCalendar } from "@/components/progress-calendar";
import { ProgressPhotoForm } from "@/components/progress-photo-form";
import { createPresignedReadUrl } from "@/lib/storage";
import { requireUserId } from "@/lib/session";

export default async function ProgressPage() {
  const userId = await requireUserId();
  const db = getDb();

  const records = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.userId, userId), eq(uploads.entityType, "progress_photo")))
    .orderBy(desc(uploads.capturedAt))
    .limit(40);

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

  return (
    <main className="grid gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
      <ProgressPhotoForm />
      <ProgressCalendar entries={calendarEntries} />
    </main>
  );
}
