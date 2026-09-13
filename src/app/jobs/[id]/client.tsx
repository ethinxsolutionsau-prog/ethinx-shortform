"use client";
import { useState } from "react";

export default function JobPipelineClient({ job }: { job: any }) {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(url: string, opts?: any) {
    setBusy(url);
    setLog((l) => [...l, `→ ${url}`]);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: opts ? JSON.stringify(opts) : undefined });
    const json = await res.json().catch(() => ({}));
    setLog((l) => [...l, `${res.status} ${JSON.stringify(json).slice(0, 800)}`]);
    setBusy(null);
    if (!res.ok) alert(json.error || "failed");
    else location.reload();
  }

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-sm">Pipeline Controls — BUILD ORDER (shortest to revenue)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <button onClick={() => call(`/api/jobs/${job.id}/collect`)} disabled={!!busy} className="border rounded p-3 hover:bg-zinc-50 text-left">
          <div className="font-bold">1. Collector</div>
          <div className="text-zinc-500">Scan website + socials</div>
          <div className="font-mono text-[10px]">POST /collect</div>
        </button>
        <button onClick={() => call(`/api/jobs/${job.id}/brief`)} disabled={!!busy} className="border rounded p-3 hover:bg-zinc-50 text-left">
          <div className="font-bold">2. Brief Builder</div>
          <div className="text-zinc-500">→ /brief/[id]</div>
          <div className="font-mono text-[10px]">POST /brief</div>
        </button>
        <button onClick={() => call(`/api/jobs/${job.id}/brief/approve`)} disabled={!!busy} className="border rounded p-3 hover:bg-sky-50 text-left border-sky-200">
          <div className="font-bold">3. Approve Brief</div>
          <div className="text-zinc-500">BriefReview → SCRIPTING</div>
          <div className="font-mono text-[10px]">POST /brief/approve</div>
        </button>
        <button onClick={() => call(`/api/jobs/${job.id}/scripts`)} disabled={!!busy} className="border rounded p-3 hover:bg-zinc-50 text-left">
          <div className="font-bold">4. Script Engine</div>
          <div className="text-zinc-500">4 angles, DeepSeek mock</div>
          <div className="font-mono text-[10px]">POST /scripts</div>
        </button>
        <button onClick={() => call(`/api/jobs/${job.id}/storyboard`)} disabled={!!busy} className="border rounded p-3 hover:bg-zinc-50 text-left">
          <div className="font-bold">5. Storyboard</div>
          <div className="text-zinc-500">Asset matcher + confidence</div>
          <div className="font-mono text-[10px]">POST /storyboard</div>
        </button>
        <label className="border rounded p-3 hover:bg-zinc-50 text-left cursor-pointer">
          <div className="font-bold">2. Manual Assets (6 slots)</div>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            className="text-[10px] mt-1"
            onChange={async (e) => {
              if (!e.target.files?.length) return;
              const fd = new FormData();
              Array.from(e.target.files).forEach((f) => fd.append("file", f));
              setBusy("upload");
              const res = await fetch(`/api/jobs/${job.id}/assets`, { method: "POST", body: fd });
              const json = await res.json();
              setLog((l) => [...l, `upload ${res.status} ${JSON.stringify(json).slice(0, 400)}`]);
              setBusy(null);
              if (res.ok) location.reload();
            }}
          />
        </label>
        <button onClick={() => call(`/api/jobs/${job.id}/render`)} disabled={!!busy} className="border rounded p-3 hover:bg-zinc-50 text-left bg-amber-50">
          <div className="font-bold">6. Renderer (FFmpeg)</div>
          <div className="text-zinc-500">1080x1920 H264 15s</div>
          <div className="font-mono text-[10px]">POST /render</div>
        </button>
        <button onClick={() => call(`/api/jobs/${job.id}/qa`)} disabled={!!busy} className="border rounded p-3 hover:bg-zinc-50 text-left">
          <div className="font-bold">7. QA</div>
          <div className="text-zinc-500">deterministic + Vertex/Whisper mock</div>
          <div className="font-mono text-[10px]">POST /qa</div>
        </button>
        <button onClick={() => call(`/api/jobs/${job.id}/repair`)} disabled={!!busy} className="border rounded p-3 hover:bg-zinc-50 text-left">
          <div className="font-bold">8. Repair (max 2)</div>
          <div className="text-zinc-500">SAFE allow-list only</div>
          <div className="font-mono text-[10px]">POST /repair</div>
        </button>
        <button onClick={() => window.location.href = `/review/${job.id}`} className="border rounded p-3 hover:bg-zinc-50 text-left bg-zinc-900 text-white">
          <div className="font-bold">9. Human Approval</div>
          <div className="text-zinc-300">Approve → release_eligible=true</div>
          <div className="font-mono text-[10px]">/review/[id]</div>
        </button>
        <button onClick={() => call(`/api/jobs/${job.id}/deliver`)} disabled={!!busy} className="border rounded p-3 hover:bg-green-50 text-left border-green-200">
          <div className="font-bold">10. Delivery</div>
          <div className="text-zinc-500">zip + report (fail-closed)</div>
          <div className="font-mono text-[10px]">POST /deliver</div>
        </button>
      </div>

      <div className="text-xs">
        <div className="font-semibold">Assets ({job.assets.length})</div>
        <div className="flex gap-2 mt-1 flex-wrap">
          {job.assets.map((a: any) => (
            <span key={a.id} className="border rounded px-2 py-1 font-mono text-[10px]">
              {a.assetId.slice(0, 18)} • {a.type} • {a.usage} • {a.qualityScore}
            </span>
          ))}
        </div>
      </div>

      <div className="text-xs">
        <div className="font-semibold">Scripts ({job.scripts.length}/4)</div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {job.scripts.map((s: any) => (
            <div key={s.id} className="border rounded p-2">
              <div className="font-bold font-mono">{s.angle}</div>
              <div className="text-zinc-600 line-clamp-2">{s.voiceover}</div>
              <div className="font-mono text-[10px]">{(s.scenes as any).map((sc: any) => sc.caption).join(" | ")}</div>
              <div className="text-[10px]">{s.validated ? "✓ validated" : "✗ " + JSON.stringify(s.validationErrors)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs">
        <div className="font-semibold">Videos ({job.videos.length}/4)</div>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {job.videos.map((v: any) => (
            <div key={v.id} className="border rounded p-2 font-mono">
              <div>{v.angle} • {v.status}</div>
              <div className="text-[10px]">{v.width}x{v.height} • {v.duration?.toFixed(1)}s</div>
              <div className="text-[10px] truncate">{v.checksum?.slice(0, 12)}</div>
              {v.filePath && <div className="text-[10px] truncate">{v.filePath}</div>}
            </div>
          ))}
        </div>
      </div>

      {job.qaResults.length > 0 && (
        <div className="text-xs">
          <div className="font-semibold">Latest QA</div>
          <pre className="bg-zinc-900 text-green-300 p-2 rounded overflow-auto max-h-40 text-[10px]">{JSON.stringify(job.qaResults[0], null, 2)}</pre>
        </div>
      )}

      <div className="bg-zinc-900 text-green-400 font-mono text-[10px] p-3 rounded max-h-40 overflow-auto">
        {log.length === 0 ? "idle" : log.map((l, i) => <div key={i}>{l}</div>)}
        {busy && <div>loading {busy}...</div>}
      </div>

      <div className="flex gap-2 text-xs">
        <a href={`/api/jobs/${job.id}`} target="_blank" className="border px-2 py-1 rounded">
          GET /api/jobs/{job.id}
        </a>
        {job.state === "APPROVED" && job.releaseEligible && <a href={`/api/delivery/${job.id}`} className="bg-green-600 text-white px-3 py-1 rounded">Download ZIP</a>}
      </div>
    </div>
  );
}
