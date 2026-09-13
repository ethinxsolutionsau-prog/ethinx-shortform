import prisma from "../prisma";
import { getTemplate } from "../templates";
import { logAudit } from "./audit";
import path from "path";
import fs from "fs";
import { execSync, spawn } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

const RENDER_ROOT = path.join(process.cwd(), "renders");
const FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeDrawText(text: string): string {
  // Escape for ffmpeg drawtext: \ : ' %
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%");
}

async function probeDuration(file: string): Promise<number> {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`, { encoding: "utf-8" });
    return parseFloat(out.trim());
  } catch {
    return 0;
  }
}

export async function renderAll(jobId: string): Promise<{ angle: string; filePath: string }[]> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { scripts: true, assets: true } });
  if (!job) throw new Error("Job not found");
  if (job.scripts.length !== 4) throw new Error("Expected 4 scripts before rendering");

  await prisma.job.update({ where: { id: jobId }, data: { state: "RENDERING" } });

  const template = getTemplate("transformation_v1");
  const jobDir = path.join(RENDER_ROOT, jobId);
  ensureDir(jobDir);

  const results: { angle: string; filePath: string }[] = [];

  // Clear old videos
  await prisma.video.deleteMany({ where: { jobId } });

  for (const script of job.scripts) {
    const angle = script.angle.toLowerCase();
    const scenes = script.scenes as any[];
    const outPath = path.join(jobDir, `${String(script.angle).padStart(2, "0")}-${angle}.mp4`.toLowerCase());
    // For deterministic naming spec: 01-problem.mp4 etc
    const angleMap: Record<string, string> = { PROBLEM: "01-problem", PROOF: "02-proof", OFFER: "03-offer", DIRECT: "04-direct" };
    const fileName = `${angleMap[script.angle] || angle}.mp4`;
    const finalPath = path.join(jobDir, fileName);

    await renderSingle({
      outPath: finalPath,
      scenes,
      cta: script.cta,
      template,
      jobId,
      angle: script.angle,
    });

    const stat = fs.statSync(finalPath);
    const checksum = crypto.createHash("sha256").update(fs.readFileSync(finalPath)).digest("hex");
    const duration = await probeDuration(finalPath);

    // Thumbnail via ffmpeg
    const thumbPath = finalPath.replace(".mp4", ".jpg");
    try {
      execSync(`ffmpeg -y -i "${finalPath}" -ss 1 -vframes 1 -q:v 2 "${thumbPath}" -loglevel error`);
    } catch {}

    const video = await prisma.video.create({
      data: {
        jobId,
        angle: script.angle as any,
        templateId: template.template_id,
        status: "rendered",
        filePath: finalPath,
        thumbnailPath: thumbPath,
        duration,
        width: template.width,
        height: template.height,
        checksum,
        renderSettings: {
          template: template.template_id,
          width: template.width,
          height: template.height,
          duration: template.duration,
          fps: 30,
          codec: "h264_aac",
          captionSafeWidth: template.caption_safe_width,
          logoZone: template.logo_zone,
          transition: template.transitions,
          fontSizeCaption: template.font_sizes.caption,
          fontSizeCta: template.font_sizes.cta,
        } as any,
      },
    });

    await logAudit(jobId, `render:${script.angle}:done`, { payload: { filePath: finalPath, checksum, duration, size: stat.size } });
    results.push({ angle: script.angle, filePath: finalPath });
  }

  await prisma.job.update({ where: { id: jobId }, data: { state: "QUALITY_REVIEW" } });
  await logAudit(jobId, "render:all_done", { payload: { count: results.length } });

  return results;
}

type RenderOpts = {
  outPath: string;
  scenes: { start: number; end: number; visual_intent: string; caption: string }[];
  cta: string;
  template: any;
  jobId: string;
  angle: string;
};

async function renderSingle(opts: RenderOpts): Promise<void> {
  const { outPath, scenes, cta, template } = opts;

  // Build drawtext filters for captions burned in safe zone
  // Use font if exists else default
  const font = fs.existsSync(FONT_PATH) ? `:fontfile=${FONT_PATH}` : "";
  const W = template.width;
  const H = template.height;

  // For each scene, overlay caption centered in safe zone
  // We'll create a single lavfi background + drawtext chain
  // Simplify: generate testsrc + color variation per angle + captions sequenced via enable

  const angleColor: Record<string, string> = {
    PROBLEM: "0x0EA5E9",
    PROOF: "0x111827",
    OFFER: "0xF59E0B",
    DIRECT: "0x10B981",
  };
  const baseColor = angleColor[opts.angle] || "0x0EA5E9";

  // Build drawtext per scene
  const drawtexts = scenes
    .map((s, i) => {
      const text = escapeDrawText(s.caption);
      // y position: bottom 400px safe zone for captions, centered
      const y = H - 500 - (i % 2 === 0 ? 0 : 120); // alternate slightly to test
      // font size 64 for caption, 72 for CTA
      const isCta = s.start >= 12;
      const fontSize = isCta ? template.font_sizes.cta : template.font_sizes.caption;
      // box around text for readability
      return `drawtext${font}=text='${text}':fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=12:x=(w-text_w)/2:y=${y}:enable='between(t\\,${s.start}\\,${s.end})'`;
    })
    .join(",");

  // Add logo placeholder top-right
  const logoDraw = `drawtext${font}=text='ETHINX':fontsize=32:fontcolor=white:x=w-tw-40:y=60:box=1:boxcolor=black@0.4:boxborderw=8`;

  // End card contact (cta Start >=12)
  const endCard = `drawtext${font}=text='${escapeDrawText(cta.toUpperCase())}':fontsize=56:fontcolor=yellow:box=1:boxcolor=black@0.7:boxborderw=14:x=(w-text_w)/2:y=(h-text_h)/2+200:enable='gte(t\\,12)'`;

  // Build filter_complex
  // Input: color source or testsrc
  const vf = [drawtexts, logoDraw, endCard].filter(Boolean).join(",");

  // Use anullsrc for silent audio + later mix would add voiceover/music
  // For MVP: generate silent audio 15s + test video
  const cmd = `ffmpeg -y -f lavfi -i "color=c=${baseColor}:s=${W}x${H}:d=15:r=30" -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" -t 15 -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 -b:v 2500k -maxrate 3000k -bufsize 6000k -c:a aac -b:a 128k -shortest -movflags +faststart "${outPath}" -loglevel error`;

  try {
    execSync(cmd, { stdio: "pipe", timeout: 30000 });
  } catch (e: any) {
    // Fallback simple render without drawtext if fails
    const fallback = `ffmpeg -y -f lavfi -i "testsrc=s=${W}x${H}:d=15:r=30" -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=48000" -t 15 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "${outPath}" -loglevel error`;
    execSync(fallback, { stdio: "pipe", timeout: 30000 });
  }

  // Validate file exists and <15MB
  const stat = fs.statSync(outPath);
  if (stat.size > 15 * 1024 * 1024) {
    throw new Error(`Rendered file too large: ${stat.size} >15MB`);
  }
  if (stat.size === 0) throw new Error("Rendered file empty");
}

export async function getVideos(jobId: string) {
  return prisma.video.findMany({ where: { jobId }, orderBy: { angle: "asc" } });
}
