"use client";

import { useState } from "react";
import Link from "next/link";

type WorkoutShareActionsProps = {
  title: string;
};

export function WorkoutShareActions({ title }: WorkoutShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setShareError(null);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setShareError("Could not copy link.");
    }
  }

  async function shareNow() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title,
        text: "Check out my completed workout.",
        url: window.location.href,
      });
      setShareError(null);
    } catch {
      // Ignore cancellation.
    }
  }

  return (
    <section className="panel p-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={shareNow}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Share
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          {copied ? "Copied" : "Copy Link"}
        </button>
        <Link
          href="/friends"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Friends
        </Link>
      </div>
      {shareError ? <p className="mt-1 text-[11px] text-rose-600">{shareError}</p> : null}
    </section>
  );
}
