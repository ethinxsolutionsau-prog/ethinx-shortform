import prisma from "../prisma";
import { logAudit } from "./audit";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import archiver from "archiver";

const RENDER_ROOT = path.join(process.cwd(), "renders");
const DELIVERY_ROOT = path.join(process.cwd(), "delivery");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function createDelivery(jobId: string): Promise<{ zipPath: string; report: any }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { videos: true, scripts: true, assets: true, qaResults: true, auditLogs: true },
  });
  if (!job) throw new Error("Job not found");

  // FAIL CLOSED: check releaseEligible
  if (!job.releaseEligible || job.state !== "APPROVED") {
    throw new Error(`Delivery blocked: job not release eligible. state=${job.state} releaseEligible=${job.releaseEligible}. Need human approval.`);
  }

  const business = (job.brief as any)?.business?.name || job.businessUrl.replace(/^https?:\/\//, "").replace(/[^a-z0-9]/gi, "_");
  const safeName = business.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const outDir = path.join(DELIVERY_ROOT, jobId);
  ensureDir(outDir);
  ensureDir(path.join(outDir, safeName));
  ensureDir(path.join(outDir, safeName, "thumbnails"));

  const packageDir = path.join(outDir, safeName);

  // Copy videos with spec names 01-problem.mp4 etc
  const mapping: Record<string, string> = { PROBLEM: "01-problem.mp4", PROOF: "02-proof.mp4", OFFER: "03-offer.mp4", DIRECT: "04-direct.mp4" };
  const checksums: Record<string, string> = {};

  for (const v of job.videos) {
    const src = v.filePath!;
    const destName = mapping[v.angle] || `${v.angle.toLowerCase()}.mp4`;
    const dest = path.join(packageDir, destName);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      const hash = crypto.createHash("sha256").update(fs.readFileSync(dest)).digest("hex");
      checksums[destName] = hash;
    }
    // thumbnail
    if (v.thumbnailPath && fs.existsSync(v.thumbnailPath)) {
      const thumbDest = path.join(packageDir, "thumbnails", destName.replace(".mp4", ".jpg"));
      fs.copyFileSync(v.thumbnailPath, thumbDest);
    }
  }

  // captions.txt - combined
  const captionsContent = job.scripts
    .map((s) => {
      const scenes = s.scenes as any[];
      return `--- ${s.angle} ---\nVoiceover: ${s.voiceover}\nCTA: ${s.cta}\nCaptions: ${scenes.map((sc) => sc.caption).join(" | ")}\n`;
    })
    .join("\n");
  fs.writeFileSync(path.join(packageDir, "captions.txt"), captionsContent);

  // Also individual caption.txt per spec for single? spec says production-report etc
  // For four-pack, also create production-report.json

  // posting-notes.txt
  const postingNotes = `EthinX Short-Form Package for ${business}\nGenerated: ${new Date().toISOString()}\n\nInstructions:\n- Upload 1080x1920 vertical videos to Instagram Reels / TikTok / YouTube Shorts\n- Use captions.txt for copy\n- CTA: ${(job.brief as any)?.cta || "Get your free quote"}\n- Offer: ${job.offer}\n- Contact: ${job.phone || (job.brief as any)?.contact?.phone || job.businessUrl}\n- Brand colours: ${(job.brief as any)?.brand_colours?.join(", ")}\n`;
  fs.writeFileSync(path.join(packageDir, "posting-notes.txt"), postingNotes);

  // production-report.json
  const report = {
    jobId,
    business,
    businessUrl: job.businessUrl,
    campaignGoal: job.campaignGoal,
    targetLocation: job.targetLocation,
    primaryService: job.primaryService,
    offer: job.offer,
    sources: (job.brandData as any)?.provenance || [],
    claims: job.scripts.map((s) => ({ angle: s.angle, claims_used: s.claimsUsed, validated: s.validated })),
    assets: job.assets.map((a) => ({ asset_id: a.assetId, source_url: a.sourceUrl, type: a.type, usage: a.usage, manifest: a.manifest })),
    modelVersions: {
      deepseek: process.env.DEEPSEEK_API_KEY ? "deepseek-mock-v1" : "mock",
      whisper: "whisper-mock-v1",
      vertex: "vertex-mock-v1",
      ffmpeg: "6.1.1",
    },
    templateVersion: "transformation_v1",
    renderSettings: job.videos.map((v) => v.renderSettings),
    qaOutcome: job.qaResults.map((q) => ({ passed: q.passed, checks: q.checks })),
    repairHistory: job.auditLogs.filter((a) => a.action.includes("repair") || a.action.includes("qa")),
    humanApproval: { approvedAt: job.approvedAt, approvedBy: job.approvedBy, state: job.state, releaseEligible: job.releaseEligible },
    checksums,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(packageDir, "production-report.json"), JSON.stringify(report, null, 2));

  // Thumbnail for single case also root
  if (job.videos[0]?.thumbnailPath && fs.existsSync(job.videos[0].thumbnailPath)) {
    fs.copyFileSync(job.videos[0].thumbnailPath, path.join(packageDir, "thumbnail.jpg"));
  }
  fs.writeFileSync(path.join(packageDir, "caption.txt"), captionsContent);

  // Create zip
  const zipPath = path.join(DELIVERY_ROOT, `${safeName}-${jobId}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));
    archive.pipe(output);
    archive.directory(packageDir, safeName);
    archive.finalize();
  });

  await prisma.job.update({ where: { id: jobId }, data: { state: "DELIVERED" } });
  await logAudit(jobId, "delivery:created", { fromState: "APPROVED", toState: "DELIVERED", payload: { zipPath, checksums } });

  return { zipPath, report };
}

export async function getDeliveryPath(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  const business = (job.brief as any)?.business?.name || "package";
  const safeName = business.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const zipPath = path.join(DELIVERY_ROOT, `${safeName}-${jobId}.zip`);
  return { zipPath, exists: fs.existsSync(zipPath) };
}
