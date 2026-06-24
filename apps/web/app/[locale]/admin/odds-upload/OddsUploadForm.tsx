'use client';

/**
 * Admin CSV upload form for NPFL odds. Uses multipart upload and renders the
 * importer result returned by the API.
 */
import { useState } from 'react';

export function OddsUploadForm() {
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');

  async function upload(file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/admin/odds/upload', { method: 'POST', body: form });
    const json = (await response.json().catch(() => ({}))) as { inserted?: number; updated?: number; errors?: unknown[]; error?: string };
    setMessage(
      response.ok
        ? `${json.inserted ?? 0} inserted, ${json.updated ?? 0} updated, ${(json.errors ?? []).length} errors`
        : json.error ?? 'Upload failed',
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        upload(event.dataTransfer.files.item(0));
      }}
      className={`mt-8 rounded-2xl border border-dashed p-8 ${dragging ? 'border-edge-cyan bg-edge-cyan/10' : 'border-white/15 bg-ink-1'}`}
    >
      <label className="block text-sm font-medium" htmlFor="odds-csv">NPFL odds CSV</label>
      <input
        id="odds-csv"
        name="file"
        type="file"
        accept=".csv,text/csv"
        className="mt-4 block w-full text-sm text-mute-1 file:mr-4 file:rounded-lg file:border-0 file:bg-edge-cyan file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink-0"
        onChange={(event) => upload(event.currentTarget.files?.item(0) ?? null)}
      />
      {message ? <p className="mt-4 text-sm text-mute-1" aria-live="polite">{message}</p> : null}
    </div>
  );
}
