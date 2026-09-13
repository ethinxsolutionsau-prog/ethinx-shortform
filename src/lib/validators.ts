import { z } from "zod";

export const IntakeSchema = z.object({
  business_url: z.string().url(),
  campaign_goal: z.enum(["quote_requests", "bookings", "calls", "leads"]).default("quote_requests"),
  target_location: z.string().min(2),
  target_customer: z.string().min(2),
  primary_service: z.string().min(2),
  offer: z.string().min(2),
  output_formats: z.array(z.enum(["9:16", "1:1", "16:9"])).default(["9:16"]),
  asset_permission_confirmed: z.boolean().default(false),
  instagram_url: z.string().url().optional(),
  facebook_url: z.string().url().optional(),
  phone: z.string().optional(),
  landing_url: z.string().url().optional(),
  brand_restrictions: z.string().optional(),
  voice_preference: z.string().optional(),
  music_preference: z.string().optional(),
});

export type IntakeInput = z.infer<typeof IntakeSchema>;

export function validateScriptAngle(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.angle || !["problem", "proof", "offer", "direct"].includes(data.angle)) errors.push("invalid angle");
  if (data.duration_seconds !== 15) errors.push("duration must be 15");
  if (!data.voiceover || typeof data.voiceover !== "string") errors.push("missing voiceover");
  else {
    const wordCount = data.voiceover.trim().split(/\s+/).length;
    if (wordCount > 38) errors.push(`voiceover too long: ${wordCount} words > 38 for 15s`);
    if (wordCount < 12) errors.push(`voiceover too short: ${wordCount} words < 12`);
  }
  if (!Array.isArray(data.scenes) || data.scenes.length === 0) errors.push("missing scenes");
  else {
    let total = 0;
    for (const s of data.scenes) {
      if (typeof s.start !== "number" || typeof s.end !== "number") errors.push("scene missing start/end");
      if (s.end <= s.start) errors.push("scene end must be > start");
      if (!s.caption || s.caption.length > 42) errors.push(`caption too long: "${s.caption}" >42 chars`);
      if (!s.visual_intent) errors.push("missing visual_intent");
      total = Math.max(total, s.end);
    }
    if (total > 15.5) errors.push("timeline overflow >15s");
    if (total < 14.5) errors.push("timeline underflow <14.5s");
    // Check required timing segments 0-3, 3-8, 8-12, 12-15
    const hasHook = data.scenes.some((s: any) => s.start === 0 && s.end === 3);
    if (!hasHook) errors.push("missing 0-3s Hook segment");
  }
  if (!data.cta || data.cta.length < 3) errors.push("missing CTA");
  if (!Array.isArray(data.claims_used)) errors.push("missing claims_used");
  return { valid: errors.length === 0, errors };
}

export function validateClaimProvenance(claims: string[], verifiedProof: { claim: string }[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const c of claims) {
    const found = verifiedProof.some((p) => p.claim.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(p.claim.toLowerCase()));
    if (!found) errors.push(`unsupported claim: ${c} not in verified_proof`);
  }
  return { valid: errors.length === 0, errors };
}
