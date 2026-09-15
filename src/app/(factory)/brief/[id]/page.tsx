import prisma from "@/lib/prisma";
import BriefClient from "./client";

export const dynamic = "force-dynamic";

export default async function BriefPage({ params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-sm">Not found</div>;
  let brief = job.brief as any;
  if (!brief && job.brandData) {
    const { buildBrief } = await import("@/lib/services/briefBuilder");
    brief = await buildBrief(params.id);
  }
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h1 className="text-lg font-black tracking-tight">Review your brief</h1>
        <p className="text-sm text-zinc-600 mt-1">Check the details. Fix anything wrong. Then approve to make scripts.</p>
        <div className="mt-3 inline-flex flex-wrap gap-2 text-xs">
          <span className="bg-zinc-900 text-white px-2.5 py-1 rounded-full font-medium">{job.state}</span>
          <span className="bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-full font-mono">{job.id.slice(0, 8)}</span>
          <span className="bg-white border border-zinc-200 px-2.5 py-1 rounded-full">{job.businessUrl}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">The script tool only sees an approved brief. Nothing is guessed.</p>
      </div>
      <BriefClient job={JSON.parse(JSON.stringify(job))} brief={brief} />
    </div>
  );
}
