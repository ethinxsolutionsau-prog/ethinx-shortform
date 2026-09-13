"use client";
import { useState } from "react";
import Payments from "@/components/Payments";

export default function ReviewClient({ job }: { job: any }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(decision: string) {
    setBusy(true);
    const res = await fetch(`/api/jobs/${job.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const j = await res.json();
    setMsg(JSON.stringify(j));
    setBusy(false);
    if (res.ok) location.reload();
  }
  async function deliver() {
    setBusy(true);
    const res = await fetch(`/api/jobs/${job.id}/deliver`, { method: "POST" });
    const j = await res.json();
    setMsg(JSON.stringify(j, null, 2).slice(0, 2000));
    setBusy(false);
    if (res.ok) alert("Delivery ready: " + j.zipPath);
  }

  const latestQa = job.qaResults?.[0];
  const canApprove = job.state === "HUMAN_REVIEW";
  const canDeliver = job.state === "APPROVED" && job.releaseEligible;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {job.videos.map((v: any) => (
          <div key={v.id} className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-zinc-900 text-white text-xs p-2 font-mono flex justify-between">
              <span>{v.angle} • {v.templateId}</span>
              <span className={v.status === "qa_passed" ? "text-green-400" : v.status === "qa_failed" ? "text-red-400" : "text-zinc-400"}>{v.status}</span>
            </div>
            <div className="aspect-[9/16] bg-zinc-100 flex items-center justify-center text-xs text-zinc-500">
              {v.filePath ? (
                <video src={`/api/renders/${job.id}/${v.filePath.split("/").pop()}`} controls className="w-full h-full object-cover" />
              ) : (
                <span>No render yet</span>
              )}
            </div>
            <div className="p-3 text-xs space-y-1">
              <div className="font-mono">{v.width}x{v.height} • {v.duration?.toFixed(2)}s • {v.checksum?.slice(0, 12)}</div>
              <div className="truncate">{v.filePath}</div>
              {v.thumbnailPath && <div className="text-[10px]">thumb: {v.thumbnailPath}</div>}
            </div>
          </div>
        ))}
        {job.videos.length === 0 && <div className="col-span-2 bg-white border rounded-xl p-6 text-sm text-zinc-500">No videos rendered yet. Go to pipeline → Render.</div>}
      </div>

      <div className="bg-white border rounded-xl p-6 text-xs space-y-4">
        <h3 className="font-bold">Scripts (4 angles) — validator: word count, unsupported claims, missing CTA, timeline, caption length, JSON</h3>
        <div className="grid grid-cols-2 gap-3">
          {job.scripts.map((s: any) => (
            <div key={s.id} className="border rounded p-3">
              <div className="font-mono font-bold">{s.angle}</div>
              <div className="mt-1">VO: {s.voiceover}</div>
              <div className="font-mono text-[10px] mt-1">{(s.scenes as any).map((sc: any) => `${sc.start}-${sc.end}s: ${sc.caption} (${sc.visual_intent})`).join(" | ")}</div>
              <div className="text-[10px]">CTA: {s.cta} • validated: {String(s.validated)}</div>
              <div className="text-[10px]">claims: {JSON.stringify(s.claimsUsed)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 text-xs space-y-3">
        <h3 className="font-bold">Assets + Sources + Manifests</h3>
        <div className="divide-y">
          {job.assets.map((a: any) => (
            <div key={a.id} className="py-2 flex justify-between">
              <span className="font-mono">{a.assetId} • {a.type} • {a.usage}</span>
              <span className="truncate max-w-[50%]">{a.sourceUrl}</span>
              <span>{a.qualityScore}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="font-bold">Claims + Evidence (provenance)</h4>
          <pre className="bg-zinc-900 text-green-300 p-2 rounded overflow-auto max-h-40 text-[10px]">{JSON.stringify((job.brief as any)?.verified_proof || job.brandData?.provenance, null, 2)}</pre>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 text-xs space-y-3">
        <h3 className="font-bold">QA Results (deterministic + Vertex AI mock + Whisper)</h3>
        {latestQa ? (
          <>
            <div className={`px-2 py-1 rounded font-mono ${latestQa.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{latestQa.passed ? "PASSED → HUMAN_REVIEW" : latestQa.repairNeeded ? "FAILED → REPAIRING" : "FAILED → ESCALATED"}</div>
            <pre className="bg-zinc-900 text-green-300 p-2 rounded overflow-auto max-h-60 text-[10px]">{JSON.stringify(latestQa, null, 2)}</pre>
          </>
        ) : (
          <div className="text-zinc-500">No QA yet — run QA from pipeline.</div>
        )}
        <div>
          <h4 className="font-bold">Repair History (max 2, SAFE allow-list only)</h4>
          <div className="font-mono text-[10px] divide-y">
            {job.auditLogs
              .filter((a: any) => a.action.includes("repair") || a.action.includes("qa"))
              .map((a: any) => (
                <div key={a.id} className="py-1">
                  {a.createdAt} — {a.action} — {a.fromState}→{a.toState}
                </div>
              ))}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">SAFE: reduce_font_size, rewrap_caption, move_text_inside_safe_zone, adjust_voice_music_balance, replace_invalid_asset, extend_cta_time, reframe_crop. UNSAFE requires approval → escalated.</div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 flex gap-3">
        <button onClick={() => act("approve")} disabled={!canApprove || busy} className="bg-green-600 text-white px-6 py-2 rounded font-medium disabled:opacity-30 hover:bg-green-700">
          Approve → release_eligible=true
        </button>
        <button onClick={() => act("revise")} disabled={!canApprove || busy} className="border px-6 py-2 rounded hover:bg-zinc-50 disabled:opacity-30">
          Revise → RENDERING
        </button>
        <button onClick={() => act("reject")} disabled={!canApprove || busy} className="border px-6 py-2 rounded hover:bg-zinc-50 disabled:opacity-30">
          Reject → ESCALATED
        </button>
        <button onClick={deliver} disabled={!canDeliver || busy} className="bg-sky-600 text-white px-6 py-2 rounded font-medium disabled:opacity-30 hover:bg-sky-700">
          Generate Delivery ZIP
        </button>
        <span className="text-xs py-2">{msg.slice(0, 200)}</span>
      </div>

      {!canApprove && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">Approval blocked: state must be HUMAN_REVIEW (QA passed). Current: {job.state}. Fail-closed: no release without approval.</div>}
      {!canDeliver && job.state === "APPROVED" && !job.releaseEligible && <div className="text-xs text-red-700 bg-red-50 border p-2">Delivery blocked: release_eligible=false</div>}
      {canDeliver && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-xs">
          Ready for delivery → <a href={`/api/delivery/${job.id}`} className="underline font-mono">Download ZIP</a> • Contains 01-problem.mp4 … 04-direct.mp4, thumbnails/, captions.txt, posting-notes.txt, production-report.json with checksums
        </div>
      )}
      {job.state === "ESCALATED" && <div className="text-xs text-red-700 bg-red-50 border p-3">ESCALATED: repair limit reached (2) → cannot be delivered. Requires human revision.</div>}

      <Payments jobId={job.id} />
    </div>
  );
}
