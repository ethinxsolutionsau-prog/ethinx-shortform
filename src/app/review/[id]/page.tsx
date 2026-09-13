import prisma from "@/lib/prisma";
import ReviewClient from "./client";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const job = (await prisma.job.findUnique({
    where: { id: params.id },
    include: { scripts: true, videos: true, assets: true, qaResults: true, auditLogs: true },
  } as any)) as any;
  if (!job) return <div>Not found</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-6">
        <h1 className="font-bold">Human Approval Gate — /review/[jobId]</h1>
        <p className="text-xs text-zinc-500">Shows video preview, script, assets+sources, claims+evidence, QA results, repair history, Approve/Revise/Reject. Only Approve sets release_eligible=true.</p>
        <div className="text-xs font-mono mt-2">Job: {job.id} • State: {job.state} • release_eligible: {String(job.releaseEligible)} • repairs {job.repairCount}/{job.maxRepairs}</div>
      </div>
      <ReviewClient job={JSON.parse(JSON.stringify(job))} />
    </div>
  );
}
