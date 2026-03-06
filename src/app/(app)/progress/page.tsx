import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { uploads } from "@/db/schema";
import { ProgressPhotoForm } from "@/components/progress-photo-form";
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

  return (
    <main className="grid gap-4 md:grid-cols-[360px_minmax(0,1fr)]">
      <ProgressPhotoForm />
      <section className="panel p-4">
        <h1 className="text-xl font-black text-slate-900">Progress Timeline</h1>
        <ul className="mt-3 space-y-2">
          {records.map((record) => (
            <li key={record.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{new Date(record.capturedAt).toLocaleDateString()}</p>
              <p className="text-xs text-slate-500">{record.objectKey}</p>
              <p className="mt-1 text-slate-700">{record.note || "No notes."}</p>
            </li>
          ))}
          {records.length === 0 ? (
            <li className="text-sm text-slate-500">No progress photos yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
