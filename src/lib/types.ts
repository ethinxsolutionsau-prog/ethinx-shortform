export type Provenance = {
  claim: string;
  source_url: string;
  captured_at: string;
  verified: boolean;
};

export type AssetManifest = {
  asset_id: string;
  source_url: string;
  type: "image" | "video" | "logo" | "audio";
  usage: "private_mockup_only" | "approved";
  dimensions?: { width: number; height: number };
  quality_score: number;
  confidence_score?: number;
};

export type BrandData = {
  logo?: string;
  brandColours: string[];
  fonts: string[];
  serviceDescriptions: string[];
  beforeAfterMedia: AssetManifest[];
  testimonials: { text: string; source_url: string; verified: boolean }[];
  locationsServed: string[];
  cta: string;
  contact: { phone?: string; email?: string; website: string };
  offers: string[];
  differentiators: string[];
  provenance: Provenance[];
  capturedAt: string;
};

export type CampaignBrief = {
  business: { name: string; url: string; description: string };
  audience: { target_customer: string; target_location: string };
  desired_action: string; // e.g., quote_requests
  core_service: string;
  customer_problem: string;
  transformation: string;
  verified_proof: Provenance[];
  cta: string;
  brand_colours: string[];
  prohibited_claims: string[];
  offer: string;
  contact: { phone?: string; website: string };
};

export type ScriptScene = {
  start: number;
  end: number;
  visual_intent: string;
  caption: string;
};

export type ScriptAngle = {
  angle: "problem" | "proof" | "offer" | "direct";
  duration_seconds: 15;
  voiceover: string;
  scenes: ScriptScene[];
  cta: string;
  claims_used: string[];
};

export type TemplateDefinition = {
  template_id: string;
  name: string;
  aspect_ratio: "9:16";
  duration: 15;
  width: 1080;
  height: 1920;
  caption_safe_width: number;
  caption_max_lines: number;
  logo_zone: "top_right" | "bottom_right" | "top_left";
  cta_start: number;
  scenes: number;
  caption_zones: { y: number; height: number }[];
  font_sizes: { caption: number; cta: number };
  transitions: "cut" | "crossfade";
  transition_duration: number;
  music_duck_db: number;
  end_card_duration: number;
  platform_margins: { top: number; bottom: number; left: number; right: number };
};

export type JobState =
  | "INTAKE"
  | "COLLECTING"
  | "BRIEF_REVIEW"
  | "SCRIPTING"
  | "STORYBOARDING"
  | "RENDERING"
  | "QUALITY_REVIEW"
  | "REPAIRING"
  | "HUMAN_REVIEW"
  | "APPROVED"
  | "DELIVERED"
  | "ESCALATED"
  | "REVISION"
  | "FAILED";

export const STATE_TRANSITIONS: Record<JobState, JobState[]> = {
  INTAKE: ["COLLECTING"],
  COLLECTING: ["BRIEF_REVIEW", "FAILED"],
  BRIEF_REVIEW: ["SCRIPTING", "COLLECTING"],
  SCRIPTING: ["STORYBOARDING", "FAILED"],
  STORYBOARDING: ["RENDERING", "FAILED"],
  RENDERING: ["QUALITY_REVIEW", "FAILED"],
  QUALITY_REVIEW: ["HUMAN_REVIEW", "REPAIRING", "ESCALATED", "FAILED"],
  REPAIRING: ["QUALITY_REVIEW", "ESCALATED"],
  HUMAN_REVIEW: ["APPROVED", "REVISION", "ESCALATED"],
  APPROVED: ["DELIVERED"],
  DELIVERED: [],
  ESCALATED: ["REVISION", "FAILED"],
  REVISION: ["RENDERING", "SCRIPTING"],
  FAILED: [],
};

export type QaCheck = {
  name: string;
  passed: boolean;
  details: string;
  severity: "error" | "warning";
};

export type QaResultPayload = {
  deterministic: QaCheck[];
  visual: QaCheck[];
  transcript: QaCheck[];
  passed: boolean;
  repairNeeded: boolean;
  repairActions: string[];
};

export type StoryboardAsset = {
  scene_index: number;
  asset_id: string;
  source_url: string;
  type: string;
  confidence_score: number;
  checks: { orientation: boolean; resolution: boolean; watermark: boolean };
  flag_low_confidence: boolean;
};
