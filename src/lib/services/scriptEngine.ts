import prisma from "../prisma";
import { ScriptAngle, CampaignBrief } from "../types";
import { validateScriptAngle, validateClaimProvenance } from "../validators";
import { logAudit } from "./audit";

// Mock fallback - deterministic generation based on brief (used if DeepSeek fails)
function generateVoiceoverFallback(angle: string, brief: CampaignBrief): string {
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

function generateScenesFallback(angle: string, brief: CampaignBrief): any[] {
  const service = brief.core_service;
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

function mockGenerate(angle: "problem" | "proof" | "offer" | "direct", brief: CampaignBrief): ScriptAngle {
  const voiceover = generateVoiceoverFallback(angle, brief);
  const scenes = generateScenesFallback(angle, brief);
  return {
    angle,
    duration_seconds: 15,
    voiceover,
    scenes,
    cta: brief.cta,
    claims_used: [],
  };
}

// Real DeepSeek API
async function callDeepSeek(brief: CampaignBrief): Promise<ScriptAngle[] | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || key === "mock_for_dev" || key.length < 10) {
    return null;
  }
  const systemPrompt = `You receive ONLY approved campaign brief. Return strict JSON for 4 angles. Do not invent. Use only verified_proof.

Timing per video: 0-3s Hook, 3-8s Problem/transformation, 8-12s Proof/offer, 12-15s CTA. Output strict JSON array of 4 objects, each:
{"angle":"problem","duration_seconds":15,"voiceover":"...","scenes":[{"start":0,"end":3,"visual_intent":"dirty driveway close-up","caption":"DRIVEWAY LOOKING TIRED?"},{"start":3,"end":8,"visual_intent":"cleaning process","caption":"..."},{"start":8,"end":12,"visual_intent":"before after","caption":"..."},{"start":12,"end":15,"visual_intent":"cta end card","caption":"GET YOUR FREE QUOTE"}],"cta":"Get your free quote","claims_used":[]}

Rules:
- angle must be exactly one of: problem, proof, offer, direct (in that order)
- duration_seconds must be 15
- voiceover 12-38 words, must not invent contact/reviews/prices not in brief.verified_proof
- scenes must cover 0-15 exactly, first 0-3 Hook required, caption <=42 chars
- cta must match brief.cta
- claims_used must be subset of verified_proof claims or empty
- Return ONLY JSON array, no markdown, no explanation.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(brief, null, 2) },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(`DeepSeek API failed ${res.status}: ${txt.slice(0, 500)}`);
      return null;
    }
    const json: any = await res.json();
    const content: string = json.choices?.[0]?.message?.content || "";
    if (!content) return null;

    // Try to extract JSON array
    let parsed: any;
    try {
      // Remove possible markdown fences
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to find first [ to last ]
      const start = content.indexOf("[");
      const end = content.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        const slice = content.slice(start, end + 1);
        parsed = JSON.parse(slice);
      } else {
        console.warn("DeepSeek JSON parse failed", content.slice(0, 500));
        return null;
      }
    }

    if (!Array.isArray(parsed) || parsed.length !== 4) {
      console.warn("DeepSeek returned not 4 items", JSON.stringify(parsed).slice(0, 500));
      return null;
    }

    // Normalize
    const angles = ["problem", "proof", "offer", "direct"] as const;
    const normalized: ScriptAngle[] = parsed.map((item: any, idx: number) => ({
      angle: (item.angle || angles[idx]) as any,
      duration_seconds: 15,
      voiceover: String(item.voiceover || "").trim(),
      scenes: (item.scenes || []).map((s: any) => ({
        start: Number(s.start),
        end: Number(s.end),
        visual_intent: String(s.visual_intent || "").trim(),
        caption: String(s.caption || "").trim().slice(0, 42),
      })),
      cta: String(item.cta || brief.cta).trim(),
      claims_used: Array.isArray(item.claims_used) ? item.claims_used : Array.isArray(item.claimsUsed) ? item.claimsUsed : [],
    }));

    // Validate each
    for (const cand of normalized) {
      const v1 = validateScriptAngle(cand);
      const v2 = validateClaimProvenance(cand.claims_used, brief.verified_proof);
      const errs = [...v1.errors, ...v2.errors];
      if (errs.length > 0) {
        console.warn(`DeepSeek candidate ${cand.angle} failed validation: ${errs.join(", ")}`);
        return null;
      }
    }

    return normalized;
  } catch (e: any) {
    clearTimeout(timeout);
    console.warn(`DeepSeek call error: ${e.message}`);
    return null;
  }
}

export async function generateScripts(jobId: string): Promise<ScriptAngle[]> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  const brief = job.brief as unknown as CampaignBrief;
  if (!brief) throw new Error("Brief not approved");

  if (!job.briefApprovedAt) {
    throw new Error("Brief not approved - cannot generate scripts");
  }

  const angles: ("problem" | "proof" | "offer" | "direct")[] = ["problem", "proof", "offer", "direct"];
  let outputs: ScriptAngle[] | null = null;

  // Try real DeepSeek
  try {
    const deepSeekResult = await callDeepSeek(brief);
    if (deepSeekResult) {
      outputs = deepSeekResult;
      await logAudit(jobId, "script:deepseek:success", { payload: { angles: outputs.map((o) => o.angle) } });
    } else {
      await logAudit(jobId, "script:deepseek:fallback", { payload: { reason: "validation or API failed, using mock" } });
    }
  } catch (e: any) {
    await logAudit(jobId, "script:deepseek:error", { payload: { error: e.message } });
  }

  // Fallback to deterministic mock if DeepSeek failed
  if (!outputs) {
    outputs = angles.map((angle) => mockGenerate(angle, brief));
  }

  // Clear old scripts
  await prisma.script.deleteMany({ where: { jobId } });

  const persisted: ScriptAngle[] = [];
  for (const candidate of outputs) {
    const v1 = validateScriptAngle(candidate);
    const v2 = validateClaimProvenance(candidate.claims_used, brief.verified_proof);
    const allErrors = [...v1.errors, ...v2.errors];
    const validated = allErrors.length === 0;

    const created = await prisma.script.create({
      data: {
        jobId,
        angle: candidate.angle.toUpperCase() as any,
        durationSeconds: 15,
        voiceover: candidate.voiceover,
        scenes: candidate.scenes as any,
        cta: candidate.cta,
        claimsUsed: candidate.claims_used as any,
        rawJson: candidate as any,
        validated,
        validationErrors: allErrors as any,
      },
    });

    if (!validated) {
      await logAudit(jobId, `script:${candidate.angle}:validation_failed`, { payload: { errors: allErrors } });
      throw new Error(`Script validation failed for ${candidate.angle}: ${allErrors.join(", ")}`);
    }

    persisted.push(candidate);
    await logAudit(jobId, `script:${candidate.angle}:generated`, { payload: candidate });
  }

  await prisma.job.update({ where: { id: jobId }, data: { state: "STORYBOARDING" } });
  await logAudit(jobId, "scripts:completed", { payload: { count: persisted.length, source: outputs ? "deepseek_or_mock" : "mock" } });
  return persisted;
}

export async function getScripts(jobId: string) {
  return prisma.script.findMany({ where: { jobId }, orderBy: { angle: "asc" } });
}

export async function generateWithDeepSeek(brief: CampaignBrief): Promise<ScriptAngle[]> {
  const res = await callDeepSeek(brief);
  if (!res) throw new Error("DeepSeek failed or not configured");
  return res;
}
