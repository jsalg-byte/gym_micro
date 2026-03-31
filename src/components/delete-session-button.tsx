"use client";

import { useRef, useState } from "react";
import { deleteWorkoutSessionAction } from "@/server/actions";

type DeleteSessionButtonProps = {
  sessionId: string;
  buttonLabel?: string;
  buttonClassName?: string;
};

export function DeleteSessionButton({
  sessionId,
  buttonLabel = "Delete Session",
  buttonClassName = "rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50",
}: DeleteSessionButtonProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(false);

  function confirmDelete() {
    formRef.current?.requestSubmit();
    setOpen(false);
  }

  return (
    <>
      <form ref={formRef} action={deleteWorkoutSessionAction} className="inline">
        <input type="hidden" name="sessionId" value={sessionId} />
        <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
          {buttonLabel}
        </button>
      </form>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-xl border border-slate-300 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Session?</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              This removes the session and all logged sets. This cannot be undone.
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
