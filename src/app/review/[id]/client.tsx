"use client";
import { useState } from "react";
import Payments from "@/components/Payments";

export default function ReviewClient({ job }: { job: any }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(decision: string) {
    setBusy(true);
    const res = await fetch(`/api/jobs/${job.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const j = await res.json().catch(() => ({}));
    setMsg(JSON.stringify(j));
    setBusy(false);
    if (res.ok) location.reload();
  }

  async function deliver() {
    setBusy(true);
    const res = await fetch(`/api/jobs/${job.id}/deliver`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setMsg(JSON.stringify(j, null, 2).slice(0, 2000));
    setBusy(false);
    if (res.ok) {
      // trigger download
      window.location.href = `/api/delivery/${job.id}`;
    }
  }

  const latestQa = job.qaResults?.[0];
  const checks: any[] = latestQa?.checks || job.qaResults?.[0]?.checks || [];
  // QA from runQA is stored as overall, but per-video checks are in job.qaResults[0].checks
  // For display, use latestQa.checks if exists
  const canApprove = job.state === "HUMAN_REVIEW";
  const canDeliver = job.state === "APPROVED" && job.releaseEligible;
  const blockReason = !canDeliver
    ? job.state === "ESCALATED"
      ? "Escalated — repair limit hit. Fix and re-render."
      : job.state !== "APPROVED"
      ? `Need HUMAN_REVIEW → Approved. Now is ${job.state}.`
      : !job.releaseEligible
      ? "Not approved yet."
      : null
    : null;

  const videoOrder = ["PROBLEM", "PROOF", "OFFER", "DIRECT"];
  const sortedVideos = [...(job.videos || [])].sort((a: any, b: any) => videoOrder.indexOf(a.angle) - videoOrder.indexOf(b.angle));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top: 4 players */}
      <div>
        <h2 className="font-semibold">Your 4 videos — 9:16</h2>
        <p className="text-xs text-zinc-500">Watch each 15s clip. Tap to play. All are 1080×1920.</p>
        {sortedVideos.length === 0 ? (
          <div className="mt-4 bg-white border border-zinc-200 rounded-2xl p-8 text-center">
            <div className="text-sm font-medium">No videos yet</div>
            <p className="text-xs text-zinc-500 mt-1">Render them from the job page, then come back.</p>
            <a href={`/jobs/${job.id}`} className="inline-flex mt-4 bg-black text-white px-4 py-2 rounded-xl text-sm">Go to job</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {sortedVideos.map((v: any) => (
              <div key={v.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col">
                <div className="bg-zinc-900 text-white px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wide">
                    {v.angle === "PROBLEM" ? "01 Problem" : v.angle === "PROOF" ? "02 Proof" : v.angle === "OFFER" ? "03 Offer" : "04 Direct"}
                  </span>
                  <span className={`text-[11px] px-2 py-1 rounded-full font-medium border ${v.status === "qa_passed" ? "bg-green-500 text-white border-green-500" : v.status === "qa_failed" ? "bg-red-500 text-white border-red-500" : "bg-white text-zinc-700 border-zinc-200"}`}>
                    {v.status}
                  </span>
                </div>
                <div className="bg-black aspect-[9/16] relative">
                  {v.filePath ? (
                    <video src={`/api/renders/${job.id}/${v.filePath.split("/").pop()}`} controls playsInline className="w-full h-full object-contain bg-black" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">No file</div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="text-xs font-mono text-zinc-600">
                    {v.width}×{v.height} • {Number(v.duration || 0).toFixed(1)}s
                  </div>
                  <div className="text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 truncate" title={v.checksum}>
                    {v.checksum?.slice(0, 16)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QA */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Quality check — 76 checks</h3>
            <p className="text-xs text-zinc-500">Green is good. Red needs a fix.</p>
          </div>
          {latestQa && <span className={`px-3 py-1 rounded-full text-xs font-bold border ${latestQa.passed ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{latestQa.passed ? "PASS" : "FAIL"}</span>}
        </div>

        {!latestQa ? (
          <div className="mt-4 text-sm text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl p-4">No QA yet. Run QA from the job page.</div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-auto">
              {(latestQa.checks || checks || []).slice(0, 76).map((c: any, i: number) => (
                <div key={i} className={`border rounded-xl px-3 py-2 flex items-start gap-2 ${c.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${c.passed ? "bg-green-600" : "bg-red-600"}`} />
                  <div className="min-w-0">
                    <div className={`text-xs font-medium ${c.passed ? "text-green-800" : "text-red-800"}`}>{c.name}</div>
                    <div className="text-xs text-zinc-600 truncate">{c.details}</div>
                  </div>
                </div>
              ))}
            </div>
            <details className="mt-3">
              <summary className="text-xs font-medium text-zinc-600 cursor-pointer">Show details (JSON)</summary>
              <pre className="mt-2 bg-zinc-900 text-green-300 p-3 rounded-xl overflow-auto max-h-60 text-xs font-mono">{JSON.stringify(latestQa, null, 2)}</pre>
            </details>
          </>
        )}

        <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
          <div className="text-xs font-semibold">Repair history</div>
          <p className="text-xs text-zinc-500">Max 2 tries. After that it needs you.</p>
          <div className="mt-2 divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden bg-white">
            {job.auditLogs.filter((a: any) => a.action.includes("repair") || a.action.includes("qa")).length === 0 ? (
              <div className="p-3 text-xs text-zinc-500">No repairs yet</div>
            ) : (
              job.auditLogs
                .filter((a: any) => a.action.includes("repair") || a.action.includes("qa"))
                .slice(-6)
                .map((a: any) => (
                  <div key={a.id} className="flex gap-2 px-3 py-2 text-xs">
                    <span className="text-zinc-400 font-mono shrink-0">{new Date(a.createdAt).toLocaleTimeString()}</span>
                    <span className="font-medium flex-1">{a.action}</span>
                    <span className="text-zinc-500 font-mono">{a.fromState ? `${a.fromState}→${a.toState}` : ""}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Paywall */}
      <div>
        <h3 className="font-semibold mb-3">Pay to unlock delivery</h3>
        <Payments jobId={job.id} />
        <p className="text-xs text-zinc-500 mt-2">You paid? Still need human approval. Delivery stays locked until approved.</p>
      </div>

      {/* Delivery */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h3 className="font-semibold">Delivery</h3>
        <p className="text-xs text-zinc-500">Get your zip and report. Only when approved.</p>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button onClick={act.bind(null, "approve")} disabled={!canApprove || busy} className="flex-1 bg-black text-white py-3 rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-40">
            {canApprove ? "Approve — unlock delivery" : "Need QA pass first"}
          </button>
          <button onClick={deliver} disabled={!canDeliver || busy} className="flex-1 bg-white border border-zinc-200 py-3 rounded-xl font-semibold hover:bg-zinc-50 disabled:opacity-40">
            Download zip
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => act("revise")} disabled={!canApprove || busy} className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 disabled:opacity-40">
            Revise
          </button>
          <button onClick={() => act("reject")} disabled={!canApprove || busy} className="text-xs border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 disabled:opacity-40">
            Reject
          </button>
          <span className="text-xs text-zinc-500 py-1.5 truncate flex-1">{msg.slice(0, 120)}</span>
        </div>

        {blockReason && <div className="mt-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{blockReason}</div>}
        {canDeliver && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="text-sm font-semibold text-green-800">Ready to download</div>
            <p className="text-xs text-green-700 mt-1">4 videos + thumbnails + captions + report</p>
            <a href={`/api/delivery/${job.id}`} className="mt-2 inline-flex bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700">
              Download ZIP
            </a>
            <a href={`/api/delivery/${job.id}`} target="_blank" className="ml-2 inline-flex bg-white border border-green-200 px-4 py-2 rounded-xl text-sm font-medium">
              View report
            </a>
          </div>
        )}
        {job.state === "ESCALATED" && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">Escalated — fix the issue and re-render. Then approve.</div>}

        {/* Checksums & report */}
        {canDeliver && job.videos.length > 0 && (
          <div className="mt-4 border border-zinc-200 rounded-xl p-3 bg-zinc-50">
            <div className="text-xs font-semibold">Checksums (from production-report.json)</div>
            <div className="mt-2 space-y-1 font-mono text-xs">
              {job.videos.map((v: any) => (
                <div key={v.id} className="flex justify-between gap-2 bg-white border border-zinc-200 rounded-lg px-2 py-1">
                  <span>{v.angle.toLowerCase()}.mp4</span>
                  <span className="truncate max-w-[180px] text-zinc-500">{v.checksum}</span>
                </div>
              ))}
            </div>
            <a href={`/api/delivery/${job.id}`} className="mt-2 inline-flex text-xs text-zinc-600 underline">
              Open ZIP to see production-report.json
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
