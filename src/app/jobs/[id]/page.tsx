import prisma from "@/lib/prisma";
import Link from "next/link";
import JobPipelineClient from "./client";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: { id: string } }) {
  const job = (await prisma.job.findUnique({ where: { id: params.id }, include: { assets: true, scripts: true, videos: true, qaResults: true, auditLogs: true } } as any)) as any;
  if (!job) return <div className="text-red-600">Job not found</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold font-mono">{job.businessUrl}</h1>
            <div className="text-xs text-zinc-600">{job.primaryService} • {job.targetLocation} • {job.targetCustomer} • offer: {job.offer}</div>
            <div className="text-xs mt-2 flex gap-2">
              <span className={`px-2 py-0.5 rounded font-mono ${job.state === "DELIVERED" ? "bg-green-100 text-green-800" : job.state === "ESCALATED" ? "bg-red-100 text-red-800" : "bg-zinc-900 text-white"}`}>{job.state}</span>
              <span className={`px-2 py-0.5 rounded font-mono ${job.releaseEligible ? "bg-green-600 text-white" : "bg-amber-100 text-amber-800"}`}>{job.releaseEligible ? "release_eligible=true" : "release_eligible=false"}</span>
              <span className="px-2 py-0.5 rounded bg-zinc-100 font-mono">repairs {job.repairCount}/{job.maxRepairs}</span>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <Link href={`/brief/${job.id}`} className="border px-3 py-1.5 rounded hover:bg-zinc-50">Brief</Link>
            <Link href={`/review/${job.id}`} className="bg-zinc-900 text-white px-3 py-1.5 rounded">Review / Approve</Link>
          </div>
        </div>
        <div className="mt-4 text-xs bg-zinc-50 border rounded p-3 font-mono">
          Job ID: {job.id} • Created: {job.createdAt.toISOString()} • output: {(job.outputFormats as any).join(", ")} • permission: {String(job.assetPermissionConfirmed)}
        </div>
      </div>

      <JobPipelineClient job={JSON.parse(JSON.stringify(job))} />

      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold text-sm">Audit Log (immutable)</h3>
        <div className="mt-3 max-h-64 overflow-auto text-xs font-mono divide-y">
          {job.auditLogs.map((a: any) => (
            <div key={a.id} className="py-1 flex gap-2">
              <span className="text-zinc-400">{new Date(a.createdAt).toLocaleTimeString()}</span>
              <span className="font-bold">{a.action}</span>
              <span className="text-zinc-500">{a.fromState ? `${a.fromState}→${a.toState}` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
