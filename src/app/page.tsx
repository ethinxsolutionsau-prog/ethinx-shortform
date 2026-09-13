import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { videos: true } });
  const templates = await prisma.template.findMany();

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border p-6">
        <h1 className="text-2xl font-bold">Controlled Production Line</h1>
        <p className="text-sm text-zinc-600 mt-1">Business URL IN → Reviewed 4×15s OUT. Exactly four 15s: Problem • Proof • Offer • Direct-Response</p>
        <div className="grid grid-cols-4 gap-3 mt-6 text-xs">
          {["INTAKE → COLLECTING → BRIEF_REVIEW", "SCRIPTING → STORYBOARDING → RENDERING", "QUALITY_REVIEW → REPAIRING (max2) → HUMAN_REVIEW", "APPROVED → DELIVERED (fail-closed)"].map((s) => (
            <div key={s} className="bg-zinc-900 text-white rounded p-3 font-mono">{s}</div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <Link href="/new" className="bg-sky-600 text-white px-5 py-2 rounded font-medium">Create Campaign</Link>
          <span className="text-xs text-zinc-500 py-2">Tech: Next.js 14 • Prisma • BullMQ • FFmpeg 1080x1920 • DeepSeek • Whisper • Vertex • S3/local</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border p-6">
          <h2 className="font-semibold">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-3">No campaigns yet. Create one.</p>
          ) : (
            <div className="divide-y mt-3">
              {jobs.map((j) => (
                <div key={j.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm">{j.businessUrl}</div>
                    <div className="text-xs text-zinc-500">{j.primaryService} • {j.targetLocation} • {j.state} • {j.releaseEligible ? "release_eligible=true" : "release_eligible=false"} • repairs {j.repairCount}/{j.maxRepairs}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/jobs/${j.id}`} className="text-xs border px-2 py-1 rounded hover:bg-zinc-50">Pipeline</Link>
                    <Link href={`/brief/${j.id}`} className="text-xs border px-2 py-1 rounded hover:bg-zinc-50">Brief</Link>
                    <Link href={`/review/${j.id}`} className="text-xs bg-zinc-900 text-white px-2 py-1 rounded">Review</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold">Templates</h2>
          <ul className="text-xs mt-3 space-y-2">
            {templates.map((t) => (
              <li key={t.id} className="flex justify-between border rounded px-2 py-1.5">
                <span className="font-mono">{t.templateId}</span>
                <span className={t.templateId === "transformation_v1" ? "text-green-600 font-bold" : "text-zinc-400"}>{t.templateId === "transformation_v1" ? "MVP ✓" : "future"}</span>
              </li>
            ))}
          </ul>
          <div className="text-xs text-zinc-500 mt-3">transformation_v1: 1080x1920 • 15s • 820 safe width • top_right logo • CTA 12-15s • cut/crossfade 0.2s • duck -28db</div>
          <div className="mt-4 text-xs">
            <div className="font-semibold">Critical Rules</div>
            <ul className="list-disc ml-4 text-zinc-600 mt-1 space-y-1">
              <li>NEVER invent contact/reviews/prices</li>
              <li>Claims require provenance</li>
              <li>Script gets ONLY approved brief</li>
              <li>Deterministic templates only</li>
              <li>FFmpeg only renderer</li>
              <li>Max 2 repairs → ESCALATED</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
