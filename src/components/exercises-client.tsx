"use client";

import { useMemo, useState } from "react";
import { createExerciseAction } from "@/server/actions";
import { ExerciseDemoSourceForm } from "@/components/exercise-demo-source-form";
import { ExerciseMedia } from "@/components/exercise-media";
import { FlyoverSelect } from "@/components/flyover-select";
import type { ExerciseDemoReview } from "@/lib/exercise-gifs";

type Exercise = {
  id: string;
  name: string;
  category: string;
  muscleGroup: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  demo: ExerciseDemoReview;
};

type ExercisesClientProps = {
  initialItems: Exercise[];
};

function getDemoStatus(demo: ExerciseDemoReview) {
  if (demo.media.localPath) {
    return {
      label: "Downloaded",
      className: "border border-accent-cyan/30 bg-accent-cyan/15 text-accent-cyan",
    };
  }

  if (demo.seed?.approved && demo.seed.youtubeUrl) {
    return {
      label: "Source Saved",
      className: "border border-accent-yellow/30 bg-accent-yellow/15 text-accent-yellow",
    };
  }

  if (demo.media.status === "none" || demo.seed?.mediaType === "none") {
    return {
      label: "No Demo Needed",
      className: "border border-line bg-background text-muted",
    };
  }

  return {
    label: "Needs Source",
    className: "border border-accent-pink/30 bg-accent-pink/15 text-accent-pink",
  };
}

export function ExercisesClient({ initialItems }: ExercisesClientProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeMuscleGroup, setActiveMuscleGroup] = useState("All");
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  const toTitleCase = (str: string) => str.replace(/\b\w/g, (l) => l.toUpperCase());

  const categories = useMemo(() => {
    const cats = new Set(initialItems.map((i) => toTitleCase(i.category)));
    return ["All", ...Array.from(cats).sort()];
  }, [initialItems]);

  const muscleGroups = useMemo(() => {
    const groups = new Set(
      initialItems
        .map((i) => i.muscleGroup)
        .filter((g): g is string => !!g)
        .map((g) => toTitleCase(g))
    );
    return ["All", ...Array.from(groups).sort()];
  }, [initialItems]);

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      const catMatch = activeCategory === "All" || toTitleCase(item.category) === activeCategory;
      const muscleMatch =
        activeMuscleGroup === "All" || (item.muscleGroup && toTitleCase(item.muscleGroup) === activeMuscleGroup);
      return catMatch && muscleMatch;
    });
  }, [initialItems, activeCategory, activeMuscleGroup]);

  const itemColumns = useMemo(() => {
    return filteredItems.reduce<[Exercise[], Exercise[]]>(
      (columns, item, index) => {
        columns[index % 2].push(item);
        return columns;
      },
      [[], []],
    );
  }, [filteredItems]);

  return (
    <main className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] pb-12 transition-colors duration-300 min-w-0 w-full">
      {/* Sidebar: Add Exercise */}
      <aside className="space-y-6 min-w-0">
        <section className="rounded-3xl border border-line bg-surface p-6 shadow-xl lg:sticky lg:top-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black text-foreground">Add Exercise</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Expand your library</p>
          </div>

          <form action={createExerciseAction} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Exercise Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Bench Press"
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Category</label>
              <FlyoverSelect
                name="category"
                defaultValue="strength"
                label="Category"
                panelTitle="Choose category"
                options={[
                  { value: "strength", label: "Strength" },
                  { value: "cardio", label: "Cardio" },
                  { value: "mobility", label: "Mobility" },
                ]}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Muscle Group</label>
              <input
                name="muscleGroup"
                placeholder="e.g. Chest"
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-pink/20 transition-all focus:border-accent-pink focus:ring-4"
              />
            </div>

            <button className="w-full mt-2 rounded-2xl bg-accent-pink px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-accent-pink/20 transition-all hover:opacity-90 active:scale-95">
              Save Exercise
            </button>
          </form>
        </section>
      </aside>

      {/* Main Content: Library */}
      <section className="space-y-8 min-w-0">
        <header className="flex flex-col gap-6 px-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-3xl font-black tracking-tight text-foreground">Exercise Library</h2>
            <div className="flex gap-2 shrink-0">
              <button className="p-2 rounded-xl bg-surface border border-line text-muted hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Category Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Categories</span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      cat === activeCategory
                        ? "bg-accent-pink text-white shadow-lg shadow-accent-pink/20"
                        : "bg-surface border border-line text-muted hover:text-foreground hover:border-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Muscle Group Filter */}
            {muscleGroups.length > 1 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Muscle Groups</span>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {muscleGroups.map((group) => (
                    <button
                      key={group}
                      onClick={() => setActiveMuscleGroup(group)}
                      className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        group === activeMuscleGroup
                          ? "bg-accent-cyan text-black shadow-lg shadow-accent-cyan/20"
                          : "bg-surface border border-line text-muted hover:text-foreground hover:border-muted"
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {itemColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="space-y-4 min-w-0">
              {column.map((exercise) => {
                const isExpanded = expandedExerciseId === exercise.id;
                const demoStatus = getDemoStatus(exercise.demo);

                return (
                  <article
                    key={exercise.id}
                    className="group rounded-3xl border border-line bg-surface p-5 transition-all hover:border-foreground/20 hover:shadow-xl min-w-0"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-cyan bg-accent-cyan/10 w-fit px-2 py-0.5 rounded-lg border border-accent-cyan/20">
                          {toTitleCase(exercise.category)}
                        </span>
                        <h3 className="text-lg font-black text-foreground group-hover:text-accent-pink transition-colors truncate">
                          {toTitleCase(exercise.name)}
                        </h3>
                        {exercise.muscleGroup && (
                          <p className="text-xs font-medium text-muted">
                            Focus: <span className="text-foreground/70 font-bold">{toTitleCase(exercise.muscleGroup)}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedExerciseId(isExpanded ? null : exercise.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Hide ${exercise.name} demo` : `Show ${exercise.name} demo`}
                          className="p-3 rounded-2xl bg-background border border-line text-muted transition-all hover:text-foreground hover:scale-105"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={isExpanded ? "M20 12H4" : "M12 4v16m8-8H4"}
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-5 space-y-5 border-t border-line pt-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted">Demo</p>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${demoStatus.className}`}>
                            {demoStatus.label}
                          </span>
                        </div>

                        <ExerciseMedia
                          src={exercise.demo.media.localPath}
                          name={exercise.name}
                          controls={!!exercise.demo.media.localPath}
                          className="border border-line bg-background object-contain"
                        />

                        <ExerciseDemoSourceForm
                          exerciseId={exercise.id}
                          slug={exercise.demo.media.slug}
                          exerciseName={exercise.name}
                          category={exercise.category}
                          muscleGroup={exercise.muscleGroup}
                          youtubeUrl={exercise.demo.seed?.youtubeUrl ?? exercise.demo.media.sourceUrl}
                          start={exercise.demo.seed?.start}
                          duration={exercise.demo.seed?.duration}
                        />

                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted ml-1">Candidate Searches</p>
                          <div className="flex flex-wrap gap-2">
                            {exercise.demo.queries.map((query) => (
                              <a
                                key={`${exercise.id}-${query.label}-${query.query}`}
                                href={query.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-line bg-background px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted transition-colors hover:border-accent-pink hover:text-accent-pink"
                              >
                                {query.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="rounded-3xl border border-dashed border-line p-16 text-center">
              <p className="text-sm font-medium text-muted italic">No exercises match these filters.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
