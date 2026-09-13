import prisma from "@/lib/prisma";
import BriefClient from "./client";

export const dynamic = "force-dynamic";

export default async function BriefPage({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return <div>Not found</div>;
  // Ensure brief exists
  let brief = job.brief as any;
  if (!brief && job.brandData) {
    const { buildBrief } = await import("@/lib/services/briefBuilder");
    brief = await buildBrief(params.id);
  }
  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-6">
        <h1 className="font-bold">Campaign Brief — Review & Correct</h1>
        <p className="text-xs text-zinc-500">State: {job.state} • /brief/[jobId] • Approve to go to SCRIPTING. Script engine receives ONLY approved brief.</p>
        <div className="text-xs font-mono mt-2">Job: {job.id} • {job.businessUrl}</div>
      </div>
      <BriefClient job={JSON.parse(JSON.stringify(job))} brief={brief} />
    </div>
  );
}
