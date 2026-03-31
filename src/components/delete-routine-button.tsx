"use client";

import { useRef, useState } from "react";
import { deleteRoutineAction } from "@/server/actions";

type DeleteRoutineButtonProps = {
  routineId: string;
  routineName: string;
};

export function DeleteRoutineButton({ routineId, routineName }: DeleteRoutineButtonProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(false);

  function confirmDelete() {
    formRef.current?.requestSubmit();
    setOpen(false);
  }

  return (
    <>
      <form ref={formRef} action={deleteRoutineAction}>
        <input type="hidden" name="routineId" value={routineId} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          Delete Plan
        </button>
      </form>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-xl border border-slate-300 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Workout Plan?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              This will remove <span className="font-semibold">{routineName}</span> and all of its days and exercises.
              This cannot be undone.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-400 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
