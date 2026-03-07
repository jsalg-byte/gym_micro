"use client";

import { useState } from "react";

type UploadState = {
  message: string;
  ok: boolean;
};

export function ProgressPhotoForm() {
  const [capturedAt, setCapturedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadState | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setStatus({ ok: false, message: "Select an image first." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const presignRes = await fetch("/api/progress/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) {
        const payload = (await presignRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to create upload URL.");
      }

      const presign = (await presignRes.json()) as {
        url: string;
        key: string;
      };

      const uploadRes = await fetch(presign.url, {
        method: "PUT",
        headers: {
          "content-type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload to storage failed.");
      }

      const metadataRes = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: presign.key,
          mimeType: selectedFile.type || "application/octet-stream",
          sizeBytes: selectedFile.size,
          capturedAt,
          note,
        }),
      });

      if (!metadataRes.ok) {
        const payload = (await metadataRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to save progress photo metadata.");
      }

      setStatus({ ok: true, message: "Progress photo uploaded." });
      setSelectedFile(null);
      setNote("");
    } catch (error) {
      if (error instanceof TypeError) {
        setStatus({
          ok: false,
          message:
            "Upload failed: browser could not reach storage URL. Check S3 endpoint/public URL and bucket CORS for PUT from this app domain.",
        });
        return;
      }

      setStatus({
        ok: false,
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Progress Photo Upload</h3>
      <label className="block text-sm text-slate-700">
        Photo Date
        <input
          type="date"
          value={capturedAt}
          onChange={(event) => setCapturedAt(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <label className="block text-sm text-slate-700">
        Notes (optional)
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </label>
      <div>
        <p className="text-sm text-slate-700">Image File</p>
        <label
          htmlFor="progress-photo-input"
          className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700 hover:bg-slate-100"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 text-slate-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 7a2 2 0 0 1 2-2h3l1.2 1.5a1 1 0 0 0 .8.4H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
            <circle cx="9" cy="12" r="1.5" />
            <path d="m20 16-4.5-4.5a1 1 0 0 0-1.4 0L8 17.6" />
          </svg>
          <span>{selectedFile ? selectedFile.name : "Click to choose an image"}</span>
        </label>
        <input
          id="progress-photo-input"
          type="file"
          accept="image/*"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save"}
      </button>
      {status ? (
        <p className={`text-sm ${status.ok ? "text-emerald-700" : "text-rose-600"}`}>{status.message}</p>
      ) : null}
    </form>
  );
}
