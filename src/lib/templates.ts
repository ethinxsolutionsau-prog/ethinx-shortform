import { TemplateDefinition } from "./types";

export const transformationV1: TemplateDefinition = {
  template_id: "transformation_v1",
  name: "Transformation (Before → After)",
  aspect_ratio: "9:16",
  duration: 15,
  width: 1080,
  height: 1920,
  caption_safe_width: 820,
  caption_max_lines: 2,
  logo_zone: "top_right",
  cta_start: 12,
  scenes: 5,
  caption_zones: [
    { y: 300, height: 120 },
    { y: 1400, height: 200 },
  ],
  font_sizes: { caption: 64, cta: 72 },
  transitions: "crossfade",
  transition_duration: 0.2,
  music_duck_db: -28,
  end_card_duration: 3,
  platform_margins: { top: 120, bottom: 240, left: 40, right: 40 },
};

export const templateLibrary: Record<string, TemplateDefinition> = {
  transformation_v1: transformationV1,
  // Placeholders for other 6 templates (future)
  problem_solution_v1: {
    ...transformationV1,
    template_id: "problem_solution_v1",
    name: "Problem → Solution",
    scenes: 4,
  },
  testimonial_proof_v1: {
    ...transformationV1,
    template_id: "testimonial_proof_v1",
    name: "Testimonial / Proof",
    scenes: 4,
  },
  three_benefit_v1: {
    ...transformationV1,
    template_id: "three_benefit_v1",
    name: "Three Benefit",
    scenes: 5,
  },
  limited_offer_v1: {
    ...transformationV1,
    template_id: "limited_offer_v1",
    name: "Limited Offer",
    scenes: 4,
  },
  direct_cta_v1: {
    ...transformationV1,
    template_id: "direct_cta_v1",
    name: "Direct CTA",
    scenes: 3,
  },
  service_montage_v1: {
    ...transformationV1,
    template_id: "service_montage_v1",
    name: "Service Montage",
    scenes: 6,
  },
};

export function getTemplate(id: string): TemplateDefinition {
  const t = templateLibrary[id];
  if (!t) throw new Error(`Template not found: ${id}`);
  return t;
}

export const ALL_TEMPLATE_IDS = Object.keys(templateLibrary);
