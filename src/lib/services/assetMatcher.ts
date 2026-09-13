import prisma from "../prisma";
import { logAudit } from "./audit";
import { StoryboardAsset } from "../types";

type AssetMatchResult = {
  angle: string;
  storyboard: StoryboardAsset[];
  confidence: number;
  flagged: boolean;
};

export async function matchAssets(jobId: string): Promise<AssetMatchResult[]> {
  const job = await prisma.job.findUnique({ where: { id: jobId, }, include: { assets: true, scripts: true } });
  if (!job) throw new Error("Job not found");

  // Priority: 1.Client footage 2.Client-owned website/social 3.Licensed stock 4.AI visual 5.Text-led

  const results: AssetMatchResult[] = [];
  const assets = job.assets;

  for (const script of job.scripts) {
    const scenes = script.scenes as any[] as { start: number; end: number; visual_intent: string; caption: string }[];
    const storyboard: StoryboardAsset[] = [];
    let totalConfidence = 0;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      // Find best asset for visual_intent
      // For MVP: deterministic mock - use first available asset, fallback to text-led
      let bestAsset = assets[0];
      let confidence = 0.85;
      let type = "image";

      if (assets.length === 0) {
        // No assets -> text-led branded scene (confidence lower)
        confidence = 0.6;
        bestAsset = { assetId: `text-led-${script.angle}-${i}`, sourceUrl: "text-led", type: "text-led" } as any;
        type = "text-led";
      } else if (scene.visual_intent.includes("dirty") || scene.visual_intent.includes("close-up")) {
        // Prefer hero image for problem
        confidence = 0.88;
      } else if (scene.visual_intent.includes("transformation")) {
        confidence = 0.82;
      } else if (scene.visual_intent.includes("cta")) {
        confidence = 0.95;
        type = "logo";
      }

      // Checks: orientation, resolution, watermark, etc.
      const checks = {
        orientation: true, // 9:16 vs source - mock pass
        resolution: true,
        watermark: true, // no watermark
      };

      // Flag low confidence
      const flag = confidence < 0.7;

      storyboard.push({
        scene_index: i,
        asset_id: bestAsset.assetId || bestAsset.id || `asset-${i}`,
        source_url: bestAsset.sourceUrl,
        type,
        confidence_score: confidence,
        checks,
        flag_low_confidence: flag,
      });
      totalConfidence += confidence;
    }

    const avgConfidence = totalConfidence / scenes.length;
    const flagged = storyboard.some((s) => s.flag_low_confidence) || avgConfidence < 0.75;

    results.push({
      angle: script.angle,
      storyboard,
      confidence: avgConfidence,
      flagged,
    });

    await logAudit(jobId, `asset_match:${script.angle}`, { payload: { storyboard, confidence: avgConfidence, flagged } });
  }

  // Update job state to RENDERING ready
  await prisma.job.update({ where: { id: jobId }, data: { state: "RENDERING" } });
  await logAudit(jobId, "storyboard:completed", { payload: results });

  return results;
}

export async function uploadManualAssets(jobId: string, files: { originalName: string; path: string; mimetype: string; size: number }[]) {
  for (const f of files) {
    const assetId = `manual-${Date.now()}-${f.originalName}`;
    await prisma.asset.create({
      data: {
        jobId,
        assetId,
        sourceUrl: `/uploads/${jobId}/${f.originalName}`,
        type: f.mimetype.startsWith("video") ? "video" : "image",
        usage: "approved",
        qualityScore: 0.9,
        confidenceScore: 0.95,
        localPath: f.path,
        manifest: { asset_id: assetId, source_url: `/uploads/${jobId}/${f.originalName}`, type: f.mimetype, usage: "approved" } as any,
        provenance: { claim: `Manual upload ${f.originalName}`, source_url: "manual", captured_at: new Date().toISOString(), verified: true } as any,
      },
    });
    await logAudit(jobId, "asset:manual_upload", { payload: { assetId, file: f.originalName } });
  }
}
