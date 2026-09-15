"use client";
import { useState } from "react";

type Job = any;

export default function JobPipelineClient({ job }: { job: Job }) {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(url: string, opts?: any) {
    setBusy(url);
    setLog((l) => [...l, `→ ${url}`]);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: opts ? JSON.stringify(opts) : undefined });
    const json = await res.json().catch(() => ({}));
    setLog((l) => [...l, `${res.status} ${JSON.stringify(json).slice(0, 900)}`]);
    setBusy(null);
    if (!res.ok) alert(json.error || "Failed");
    else location.reload();
  }

  const canDeliver = job.state === "APPROVED" && job.releaseEligible;
  const blockReason =
    job.state === "ESCALATED"
      ? "Escalated — repair limit hit. Needs human fix."
      : job.state !== "APPROVED"
      ? `State is ${job.state}. You need HUMAN_REVIEW → Approved.`
      : !job.releaseEligible
      ? "Not approved yet. Go to Review and approve."
      : null;

  const cards: { title: string; desc: string; action: string; cta: string; style?: string }[] = [
    { title: "1. Collector", desc: "Copy site + social", action: `/api/jobs/${job.id}/collect`, cta: "Collect" },
    { title: "2. Brief", desc: "Make the plan", action: `/api/jobs/${job.id}/brief`, cta: "Build Brief" },
    { title: "3. Approve Brief", desc: "Lock the plan", action: `/api/jobs/${job.id}/brief/approve`, cta: "Approve", style: "bg-zinc-900 text-white" },
    { title: "4. Scripts", desc: "4 angles", action: `/api/jobs/${job.id}/scripts`, cta: "Generate" },
    { title: "5. Storyboard", desc: "Match photos", action: `/api/jobs/${job.id}/storyboard`, cta: "Board" },
    { title: "6. Render", desc: "Make 4 videos", action: `/api/jobs/${job.id}/render`, cta: "Render", style: "bg-black text-white" },
    { title: "7. QA", desc: "76 checks", action: `/api/jobs/${job.id}/qa`, cta: "Check" },
    { title: "8. Repair", desc: "Fix if needed", action: `/api/jobs/${job.id}/repair`, cta: "Repair" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h3 className="font-semibold">Steps</h3>
        <p className="text-xs text-zinc-500">Tap each step in order. Work is saved after each one.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {cards.map((c) => (
            <button
              key={c.title}
              onClick={() => call(c.action)}
              disabled={!!busy}
              className={`text-left border rounded-xl p-4 hover:bg-zinc-50 disabled:opacity-50 transition ${c.style || "bg-white border-zinc-200"}`}
            >
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="text-xs text-zinc-500">{c.desc}</div>
              <div className="mt-3 inline-flex bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-900">
                {busy === c.action ? "..." : c.cta}
              </div>
            </button>
          ))}

          <label className="border border-zinc-200 rounded-xl p-4 bg-white hover:bg-zinc-50 cursor-pointer">
            <div className="text-sm font-semibold">Assets (up to 6)</div>
            <div className="text-xs text-zinc-500">Upload your photos/video</div>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="mt-3 block w-full text-xs file:mr-3 file:bg-black file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:text-xs"
              onChange={async (e) => {
                if (!e.target.files?.length) return;
                const fd = new FormData();
                Array.from(e.target.files).slice(0, 6).forEach((f) => fd.append("file", f));
                setBusy("upload");
                const res = await fetch(`/api/jobs/${job.id}/assets`, { method: "POST", body: fd });
                const json = await res.json().catch(() => ({}));
                setLog((l) => [...l, `upload ${res.status} ${JSON.stringify(json).slice(0, 600)}`]);
                setBusy(null);
                if (res.ok) location.reload();
                else alert(json.error || "Upload failed");
              }}
            />
          </label>

          <div className="border rounded-xl p-4 bg-zinc-50">
            <div className="text-sm font-semibold">9. Review</div>
            <div className="text-xs text-zinc-500">Watch + approve</div>
            <a href={`/review/${job.id}`} className="mt-3 inline-flex bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium">
              Go to Review
            </a>
          </div>

          <div className={`border rounded-xl p-4 ${canDeliver ? "bg-green-50 border-green-200" : "bg-white border-zinc-200"}`}>
            <div className="text-sm font-semibold">10. Delivery</div>
            <div className="text-xs text-zinc-500">Get your zip</div>
            <button onClick={() => call(`/api/jobs/${job.id}/deliver`)} disabled={!!busy || !!blockReason} className="mt-3 inline-flex bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40">
              Deliver
            </button>
            {blockReason && <div className="mt-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">{blockReason}</div>}
            {canDeliver && <div className="mt-2 text-xs text-green-700">Ready — human approved</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <div className="text-sm font-semibold">Photos ({job.assets.length}/6)</div>
          <p className="text-xs text-zinc-500">Best one is picked for each scene. You can add more.</p>
          {job.assets.length === 0 ? (
            <div className="mt-3 text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl p-3">No photos yet. Upload above or we use your site images.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {job.assets.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between border border-zinc-200 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate max-w-[180px]">{a.assetId}</div>
                    <div className="text-xs text-zinc-500">{a.type} • {a.usage}</div>
                  </div>
                  <div className="text-xs font-mono bg-zinc-50 border border-zinc-200 px-2 py-1 rounded-lg">{Number(a.qualityScore || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <div className="text-sm font-semibold">Scripts ({job.scripts.length}/4)</div>
          <p className="text-xs text-zinc-500">One for each angle. Must be approved before video.</p>
          <div className="mt-3 space-y-2">
            {job.scripts.length === 0 ? (
              <div className="text-xs text-zinc-500">No scripts yet</div>
            ) : (
              job.scripts.map((s: any) => (
                <div key={s.id} className="border border-zinc-200 rounded-xl p-3">
                  <div className="text-xs font-bold">{s.angle}</div>
                  <div className="text-sm mt-1 line-clamp-2">{s.voiceover}</div>
                  <div className="text-xs text-zinc-500 mt-1 font-mono">{(s.scenes as any).map((sc: any) => sc.caption).join(" • ")}</div>
                  <div className={`mt-2 inline-flex px-2 py-1 rounded-full text-xs font-medium border ${s.validated ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {s.validated ? "Valid" : "Needs fix"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <div className="text-sm font-semibold">Videos ({job.videos.length}/4)</div>
          <p className="text-xs text-zinc-500">Made with your photos. 9:16, 15s each.</p>
          <div className="mt-3 space-y-2">
            {job.videos.length === 0 ? (
              <div className="text-xs text-zinc-500">No videos yet</div>
            ) : (
              job.videos.map((v: any) => (
                <div key={v.id} className="border border-zinc-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{v.angle}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium border ${
                        v.status === "qa_passed" ? "bg-green-50 text-green-700 border-green-200" : v.status === "qa_failed" ? "bg-red-50 text-red-700 border-red-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    {v.width}×{v.height} • {Number(v.duration || 0).toFixed(1)}s
                  </div>
                  <div className="text-xs font-mono text-zinc-400 truncate">{v.checksum?.slice(0, 12)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {job.qaResults?.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <div className="text-sm font-semibold">Latest check (QA)</div>
          <div className="text-xs text-zinc-500">76 checks. Green is good, red needs fix.</div>
          <pre className="mt-3 bg-zinc-900 text-green-300 p-3 rounded-xl overflow-auto max-h-40 text-xs font-mono">{JSON.stringify(job.qaResults[0], null, 2)}</pre>
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl p-4">
        <div className="text-xs font-semibold text-white">Log</div>
        <div className="mt-2 font-mono text-xs text-green-300 bg-black rounded-xl p-3 max-h-40 overflow-auto">
          {log.length === 0 ? "Waiting..." : log.map((l, i) => <div key={i} className="break-all">{l}</div>)}
          {busy && <div className="text-zinc-400">Working: {busy}</div>}
        </div>
        <div className="mt-3 flex gap-2">
          <a href={`/api/jobs/${job.id}`} target="_blank" className="text-xs bg-white text-black px-3 py-1.5 rounded-lg font-medium">
            View JSON
          </a>
          {canDeliver && (
            <a href={`/api/delivery/${job.id}`} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium">
              Download zip
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
