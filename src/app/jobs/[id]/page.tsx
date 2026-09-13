import prisma from "@/lib/prisma";
import Link from "next/link";
import JobPipelineClient from "./client";

export const dynamic = "force-dynamic";

const STEPS = [
  "INTAKE",
  "COLLECTING",
  "BRIEF_REVIEW",
  "SCRIPTING",
  "STORYBOARDING",
  "RENDERING",
  "QUALITY_REVIEW",
  "HUMAN_REVIEW",
  "APPROVED",
  "DELIVERED",
] as const;

function stepIndex(state: string) {
  const idx = STEPS.indexOf(state as any);
  return idx === -1 ? 0 : idx;
}

export default async function JobPage({ params }: { params: { id: string } }) {
  const job = (await prisma.job.findUnique({ where: { id: params.id }, include: { assets: true, scripts: true, videos: true, qaResults: true, auditLogs: true } } as any)) as any;
  if (!job) return <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-sm text-red-600">Job not found</div>;

  const currentIdx = stepIndex(job.state);
  const isEscalated = job.state === "ESCALATED";

  return (
    <div className="space-y-6">
      {/* Top */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Job tracker</div>
            <h1 className="text-lg font-bold truncate mt-1">{job.businessUrl}</h1>
            <p className="text-sm text-zinc-600">{job.primaryService} • {job.targetLocation} • {job.offer}</p>
            <div className="text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 mt-3 inline-flex flex-wrap gap-2">
              <span>ID {job.id.slice(0, 8)}</span>
              <span>•</span>
              <span>{new Date(job.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/brief/${job.id}`} className="inline-flex bg-white border border-zinc-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50">Brief</Link>
            <Link href={`/review/${job.id}`} className="inline-flex bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-800">Review</Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
            <span>Progress</span>
            <span>{isEscalated ? "Needs fix" : `${job.state}`}</span>
          </div>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              const isLast = s === "DELIVERED";
              return (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  <div
                    className={`px-2.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                      isEscalated && s === "HUMAN_REVIEW"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : done
                        ? "bg-black text-white border-black"
                        : active
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-500 border-zinc-200"
                    }`}
                    title={s}
                  >
                    {i + 1}. {s.replace("_", " ")}
                  </div>
                  {!isLast && <div className={`w-3 h-0.5 ${done ? "bg-black" : "bg-zinc-200"}`} />}
                </div>
              );
            })}
          </div>
          {isEscalated && <div className="mt-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">Escalated — needs human fix. Repair limit (2) hit.</div>}
        </div>

        {/* Release eligible */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${job.releaseEligible ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            <span className={`w-2 h-2 rounded-full ${job.releaseEligible ? "bg-green-600" : "bg-amber-600"}`} />
            release_eligible: {String(job.releaseEligible)}
          </span>
          <span className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-full">Repairs {job.repairCount}/{job.maxRepairs}</span>
          <span className="text-xs text-zinc-500">State: <span className="font-medium text-zinc-900">{job.state}</span></span>
        </div>

        {!job.releaseEligible && (job.state === "QUALITY_REVIEW" || job.state === "RENDERING" || job.state === "HUMAN_REVIEW") && (
          <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Delivery is locked until human approval. You must approve in Review.
          </div>
        )}
        {job.state !== "APPROVED" && job.state !== "DELIVERED" && job.state !== "HUMAN_REVIEW" && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            Can’t deliver yet — current step is {job.state}. Finish the steps above, then approve.
          </div>
        )}
      </div>

      <JobPipelineClient job={JSON.parse(JSON.stringify(job))} />

      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h3 className="font-semibold">History</h3>
        <p className="text-xs text-zinc-500">Every step is logged. Nothing is hidden.</p>
        <div className="mt-4 max-h-64 overflow-auto divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
          {job.auditLogs.length === 0 ? (
            <div className="p-4 text-xs text-zinc-500">No history yet</div>
          ) : (
            job.auditLogs.map((a: any) => (
              <div key={a.id} className="flex gap-3 px-3 py-2 text-xs">
                <span className="text-zinc-400 font-mono shrink-0">{new Date(a.createdAt).toLocaleTimeString()}</span>
                <span className="font-medium flex-1">{a.action}</span>
                <span className="text-zinc-500 font-mono">{a.fromState ? `${a.fromState} → ${a.toState}` : ""}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
