import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises } from "@/db/schema";
import { createExerciseAction } from "@/server/actions";

export default async function ExercisesPage() {
  const db = getDb();
  const items = await db.select().from(exercises).orderBy(asc(exercises.name));

  return (
    <main className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
      <section className="panel p-4">
        <h1 className="text-xl font-black text-slate-900">Add Exercise</h1>
        <form action={createExerciseAction} className="mt-3 space-y-3">
          <label className="block text-sm text-slate-700">
            Name
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <label className="block text-sm text-slate-700">
            Category
            <select
              name="category"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="mobility">Mobility</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Muscle Group
            <input
              name="muscleGroup"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Save Exercise
          </button>
        </form>
      </section>

      <section className="panel p-4">
        <h2 className="text-xl font-black text-slate-900">Exercise Library</h2>
        <ul className="mt-3 space-y-2">
          {items.map((exercise) => (
            <li key={exercise.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{exercise.name}</p>
              <p className="text-slate-600">
                {exercise.category} {exercise.muscleGroup ? `· ${exercise.muscleGroup}` : ""}
              </p>
            </li>
          ))}
          {items.length === 0 ? <li className="text-sm text-slate-500">No exercises yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
