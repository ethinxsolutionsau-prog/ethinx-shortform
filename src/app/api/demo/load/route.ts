import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs";
import { logAudit } from "@/lib/services/audit";

const DEMO_ROOT = path.join(process.cwd(), "demo");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobId = body.jobId || new URL(req.url).searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (!fs.existsSync(DEMO_ROOT)) {
      return NextResponse.json({ error: "Demo folder not found" }, { status: 404 });
    }

    const files = fs.readdirSync(DEMO_ROOT).filter((f) => /\.(jpg|jpeg|png|webp|mp4|mov)$/i.test(f));
    if (files.length === 0) return NextResponse.json({ error: "No demo assets" }, { status: 404 });

    const uploadRoot = path.join(process.cwd(), "uploads", jobId);
    if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

    const created: any[] = [];
    for (const file of files.slice(0, 6)) {
      const src = path.join(DEMO_ROOT, file);
      const dest = path.join(uploadRoot, file);
      fs.copyFileSync(src, dest);
      const stat = fs.statSync(dest);
      const isVideo = /\.(mp4|mov|webm)$/i.test(file);
      const assetId = `demo-${Date.now()}-${file}`;
      const asset = await prisma.asset.create({
        data: {
          jobId,
          assetId,
          sourceUrl: `/uploads/${jobId}/${file}`,
          type: isVideo ? "video" : "image",
          usage: "approved",
          qualityScore: 0.92,
          confidenceScore: 0.92,
          localPath: dest,
          manifest: { asset_id: assetId, source_url: `/uploads/${jobId}/${file}`, type: isVideo ? "video" : "image", usage: "approved", dimensions: { width: 1920, height: 1080 }, quality_score: 0.92 } as any,
          provenance: { claim: `Demo asset ${file}`, source_url: "demo", captured_at: new Date().toISOString(), verified: true } as any,
        },
      });
      created.push({ file, assetId: asset.assetId, size: stat.size });
    }

    await logAudit(jobId, "demo:loaded", { payload: { count: created.length, files: files.slice(0, 6) } });

    return NextResponse.json({ ok: true, jobId, copied: created.length, assets: created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // also support GET for simple copy via query
  return POST(req);
}
