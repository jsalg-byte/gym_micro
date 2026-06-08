"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateExerciseDemoSourceAction,
  type ExerciseDemoSourceActionState,
} from "@/server/actions";

type ExerciseDemoSourceFormProps = {
  exerciseId: string;
  slug: string;
  exerciseName: string;
  category: string;
  muscleGroup: string | null;
  youtubeUrl?: string | null;
  start?: string | null;
  duration?: number | null;
  variant?: "compact" | "panel";
};

const initialState: ExerciseDemoSourceActionState = {
  ok: null,
  message: "",
};

function SubmitButton({ variant }: { variant: "compact" | "panel" }) {
  const { pending } = useFormStatus();

  const className =
    variant === "compact"
      ? "rounded-lg border border-cyan-400 bg-cyan-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-cyan-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      : "w-full rounded-2xl bg-accent-cyan px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button className={className} disabled={pending}>
      {pending ? "Saving..." : "Save & Prepare Demo"}
    </button>
  );
}

export function ExerciseDemoSourceForm({
  exerciseId,
  slug,
  exerciseName,
  category,
  muscleGroup,
  youtubeUrl,
  start,
  duration,
  variant = "panel",
}: ExerciseDemoSourceFormProps) {
  const [state, formAction] = useActionState(updateExerciseDemoSourceAction, initialState);
  const isCompact = variant === "compact";
  const inputClassName = isCompact
    ? "mt-1 w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
    : "w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none ring-accent-cyan/20 transition-all focus:border-accent-cyan focus:ring-4";
  const labelClassName = isCompact
    ? "text-xs font-medium text-cyan-950"
    : "text-[10px] font-black uppercase tracking-widest text-muted ml-1";

  return (
    <form action={formAction} className={isCompact ? "grid gap-2" : "space-y-3"}>
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="exerciseName" value={exerciseName} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="muscleGroup" value={muscleGroup ?? ""} />

      <div className="space-y-1.5">
        <label className={labelClassName}>YouTube Source</label>
        <input
          name="youtubeUrl"
          type="url"
          required
          defaultValue={youtubeUrl ?? ""}
          placeholder="https://www.youtube.com/watch?v=..."
          className={inputClassName}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className={labelClassName}>Start</label>
          <input
            name="start"
            defaultValue={start ?? ""}
            placeholder="0:12"
            className={inputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClassName}>Seconds (optional)</label>
          <input
            name="duration"
            type="number"
            min="2"
            defaultValue={duration ?? ""}
            placeholder="Full video"
            className={inputClassName}
          />
        </div>
      </div>

      <SubmitButton variant={variant} />

      {state.message ? (
        <p
          aria-live="polite"
          className={`text-xs font-semibold ${
            state.ok ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
