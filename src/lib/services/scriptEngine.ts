import prisma from "../prisma";
import { ScriptAngle, CampaignBrief } from "../types";
import { validateScriptAngle, validateClaimProvenance } from "../validators";
import { logAudit } from "./audit";

// Mock DeepSeek - deterministic generation based on brief
function generateVoiceover(angle: string, brief: CampaignBrief): string {
  const service = brief.core_service;
  const location = brief.audience.target_location;
  const offer = brief.offer;
  const cta = brief.cta;
  const base: Record<string, string> = {
    problem: `Is your ${service.toLowerCase()} looking tired? Dirt and grime ruining your home's appeal in ${location}. We restore it fast. ${offer} today. ${cta}.`,
    proof: `Homeowners in ${location} trust us for ${service.toLowerCase()}. Real results, verified reviews. ${offer}. See the transformation. ${cta} now.`,
    offer: `Limited time ${offer} for ${service.toLowerCase()} in ${location}. Professional clean, stunning finish. Book today. ${cta}.`,
    direct: `Need ${service.toLowerCase()} in ${location}? Call now for ${offer}. Fast, reliable, local experts. ${cta} today.`,
  };
  return base[angle] || base.problem;
}

function generateScenes(angle: string, brief: CampaignBrief): any[] {
  const service = brief.core_service;
  // Strict timing 0-3, 3-8, 8-12, 12-15
  const captionsByAngle: Record<string, string[]> = {
    problem: [`${service.toUpperCase()} LOOKING TIRED?`, `DIRT & GRIME BUILD-UP`, `WE MAKE IT NEW AGAIN`, brief.cta.toUpperCase()],
    proof: [`TRUSTED IN ${brief.audience.target_location.toUpperCase()}`, `REAL CUSTOMER RESULTS`, `SEE THE DIFFERENCE`, brief.cta.toUpperCase()],
    offer: [`${brief.offer.toUpperCase()}`, `PROFESSIONAL ${service.toUpperCase()}`, `LIMITED TIME ONLY`, brief.cta.toUpperCase()],
    direct: [`NEED ${service.toUpperCase()}?`, `LOCAL EXPERTS NEAR YOU`, `${brief.offer.toUpperCase()} TODAY`, brief.cta.toUpperCase()],
  };
  const captions = captionsByAngle[angle] || captionsByAngle.problem;
  const intents = [
    `dirty ${service.toLowerCase()} close-up`,
    `cleaning process in action`,
    `before/after transformation`,
    `cta end card with contact`,
  ];
  return [
    { start: 0, end: 3, visual_intent: intents[0], caption: captions[0].slice(0, 42) },
    { start: 3, end: 8, visual_intent: intents[1], caption: captions[1].slice(0, 42) },
    { start: 8, end: 12, visual_intent: intents[2], caption: captions[2].slice(0, 42) },
    { start: 12, end: 15, visual_intent: intents[3], caption: captions[3].slice(0, 42) },
  ];
}

export async function generateScripts(jobId: string): Promise<ScriptAngle[]> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  const brief = job.brief as unknown as CampaignBrief;
  if (!brief) throw new Error("Brief not approved");

  // CRITICAL: script engine receives ONLY approved brief
  // Check if brief approved
  if (!job.briefApprovedAt) {
    throw new Error("Brief not approved - cannot generate scripts");
  }

  const angles: ("problem" | "proof" | "offer" | "direct")[] = ["problem", "proof", "offer", "direct"];
  const outputs: ScriptAngle[] = [];

  // Clear old scripts
  await prisma.script.deleteMany({ where: { jobId } });

  for (const angle of angles) {
    const voiceover = generateVoiceover(angle, brief);
    const scenes = generateScenes(angle, brief);
    const candidate: ScriptAngle = {
      angle,
      duration_seconds: 15,
      voiceover,
      scenes,
      cta: brief.cta,
      claims_used: [], // no unverified claims by default
    };

    // Validate
    const v1 = validateScriptAngle(candidate);
    const v2 = validateClaimProvenance(candidate.claims_used, brief.verified_proof);
    const allErrors = [...v1.errors, ...v2.errors];
    const validated = allErrors.length === 0;

    const created = await prisma.script.create({
      data: {
        jobId,
        angle: angle.toUpperCase() as any,
        durationSeconds: 15,
        voiceover,
        scenes: scenes as any,
        cta: brief.cta,
        claimsUsed: candidate.claims_used as any,
        rawJson: candidate as any,
        validated,
        validationErrors: allErrors as any,
      },
    });

    if (!validated) {
      await logAudit(jobId, `script:${angle}:validation_failed`, { payload: { errors: allErrors } });
      throw new Error(`Script validation failed for ${angle}: ${allErrors.join(", ")}`);
    }

    outputs.push(candidate);
    await logAudit(jobId, `script:${angle}:generated`, { payload: candidate });
  }

  await prisma.job.update({ where: { id: jobId }, data: { state: "STORYBOARDING" } });
  await logAudit(jobId, "scripts:completed", { payload: { count: outputs.length } });
  return outputs;
}

export async function getScripts(jobId: string) {
  return prisma.script.findMany({ where: { jobId }, orderBy: { angle: "asc" } });
}

// Optional: call real DeepSeek if key present (mock fallback)
export async function generateWithDeepSeek(brief: CampaignBrief): Promise<ScriptAngle[]> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || key === "mock_for_dev") {
    // mock path
    return [] as any;
  }
  // Real API call placeholder - would call DeepSeek API with system prompt
  // Not implemented for MVP - returns mock
  return [] as any;
}
