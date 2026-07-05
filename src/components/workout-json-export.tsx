"use client";

import { useMemo, useState } from "react";

type WorkoutJsonExportProps = {
  exportText: string;
};

export function WorkoutJsonExport({ exportText }: WorkoutJsonExportProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const lineCount = useMemo(() => exportText.split("\n").length, [exportText]);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Could not copy JSON. Select the text below and copy it manually.");
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Export Workout JSON</h2>
          <p className="mt-1 text-sm text-slate-600">
            Copy this completed workout and paste it into your Google Health logs.
          </p>
        </div>
        <button
          type="button"
          onClick={copyJson}
          className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-100"
        >
          {copied ? "Copied JSON" : "Copy JSON"}
        </button>
      </div>

      {copyError ? <p className="mt-2 text-xs text-rose-600">{copyError}</p> : null}

      <textarea
        readOnly
        value={exportText}
        rows={Math.min(Math.max(lineCount, 8), 18)}
        className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-50 outline-none focus:border-cyan-300"
        aria-label="Completed workout JSON export"
      />
    </section>
  );
}
