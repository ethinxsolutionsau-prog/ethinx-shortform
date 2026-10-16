import prisma from "../prisma";
import { logAudit } from "./audit";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import archiver from "archiver";
import { execFileSync } from "child_process";

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

  // Assert that all four real, distinct MP4s are present and decodable before packaging.
  // These checks run against the actual files, not persisted success flags.
  const requiredAngles = ["PROBLEM", "PROOF", "OFFER", "DIRECT"];
  if (job.pack !== "four" || job.videos.length !== 4 ||
      !requiredAngles.every(angle => job.videos.some(v => v.angle === angle))) {
    throw new Error("Four-pack requires one video for each of PROBLEM, PROOF, OFFER and DIRECT");
  }
  if (!job.assetPermissionConfirmed) throw new Error("Client asset permission not confirmed");
  for (const video of job.videos) {
    if (!video.filePath || !fs.existsSync(video.filePath)) throw new Error(`Missing MP4 for ${video.angle}`);
    let probe: any;
    try {
      probe = JSON.parse(execFileSync("ffprobe",
        ["-v", "error", "-show_format", "-show_streams", "-of", "json", video.filePath],
        { encoding: "utf8", timeout: 20000 }));
    } catch { throw new Error(`Unprobeable MP4 for ${video.angle}`); }
    const streams = probe.streams || [];
    const v = streams.find((s: any) => s.codec_type === "video");
    const a = streams.find((s: any) => s.codec_type === "audio");
    const duration = Number(probe.format?.duration);
    if (!v || !a || v.codec_name !== "h264" || a.codec_name !== "aac" ||
        v.width !== 1080 || v.height !== 1920 || v.pix_fmt !== "yuv420p" ||
        !Number.isFinite(duration) || duration < 14.5 || duration > 15.5) {
      throw new Error(`Invalid MP4 format, streams or duration for ${video.angle}`);
    }
    try {
      execFileSync("ffmpeg",
        ["-v", "error", "-xerror", "-i", video.filePath, "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-"],
        { stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
    } catch { throw new Error(`MP4 fails full decode for ${video.angle}`); }
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
    fs.copyFileSync(src, dest);
    const hash = crypto.createHash("sha256").update(fs.readFileSync(dest)).digest("hex");
    checksums[destName] = hash;
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

  if (Object.keys(checksums).length !== 4 || fs.statSync(zipPath).size === 0) throw new Error("Incomplete delivery ZIP");
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
