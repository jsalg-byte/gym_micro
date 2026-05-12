import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises } from "@/db/schema";
import { ExercisesClient } from "@/components/exercises-client";

export default async function ExercisesPage() {
  const db = getDb();
  const items = await db.select().from(exercises).orderBy(asc(exercises.name));

  return <ExercisesClient initialItems={items} />;
}
