import prisma from "../prisma";
import { logAudit } from "./audit";
import fs from "fs";

// SAFE allow-list
const SAFE_REPAIRS = [
  "reduce_font_size",
  "rewrap_caption",
  "move_text_inside_safe_zone",
  "adjust_voice_music_balance",
  "replace_invalid_asset",
  "extend_cta_time",
  "reframe_crop",
];

// UNSAFE requires approval
const UNSAFE_REPAIRS = [
  "rewriting_claims",
  "changing_offer",
  "inventing_proof",
  "changing_contact",
  "substituting_unapproved_media",
  "removing_disclaimers",
];

export async function attemptRepair(jobId: string): Promise<{ repaired: boolean; actions: string[] }> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { qaResults: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!job) throw new Error("Job not found");

  if (job.state !== "REPAIRING") throw new Error(`Job not in REPAIRING state, is ${job.state}`);
  if (job.repairCount > job.maxRepairs) {
    await prisma.job.update({ where: { id: jobId }, data: { state: "ESCALATED" } });
    await logAudit(jobId, "repair:escalated_max_reached", { payload: { repairCount: job.repairCount } });
    return { repaired: false, actions: [] };
  }

  const lastQa = job.qaResults[0];
  const failedChecks = lastQa ? (lastQa.checks as any[]).filter((c: any) => !c.passed) : [];

  const actions: string[] = [];

  for (const check of failedChecks) {
    if (check.name.includes("caption_overflow")) {
      actions.push("rewrap_caption");
    } else if (check.name.includes("logo_safe")) {
      actions.push("move_text_inside_safe_zone");
    } else if (check.name.includes("audio_mix")) {
      actions.push("adjust_voice_music_balance");
    } else if (check.name.includes("res") || check.name.includes("orientation")) {
      actions.push("reframe_crop");
    } else if (check.name.includes("cta_duration")) {
      actions.push("extend_cta_time");
    } else if (check.name.includes("placeholder")) {
      actions.push("replace_invalid_asset");
    } else {
      // For unknown errors, try safe generic
      actions.push("rewrap_caption");
    }
  }

  // Filter to safe only
  const safeActions = actions.filter((a) => SAFE_REPAIRS.includes(a));
  // If any unsafe needed, escalate instead
  const unsafeNeeded = actions.filter((a) => UNSAFE_REPAIRS.includes(a));
  if (unsafeNeeded.length > 0) {
    await prisma.job.update({ where: { id: jobId }, data: { state: "ESCALATED" } });
    await logAudit(jobId, "repair:unsafe_required_escalated", { payload: { unsafeNeeded } });
    return { repaired: false, actions: unsafeNeeded };
  }

  // Mock repair: just log actions, assume next render will fix
  // In real, would adjust template params and re-render
  await logAudit(jobId, "repair:attempt", { fromState: "REPAIRING", toState: "QUALITY_REVIEW", payload: { actions: safeActions } });

  // Transition back to QUALITY_REVIEW for next QA cycle
  // Actual re-render will be triggered separately, but we move state to RENDERING then QUALITY_REVIEW
  await prisma.job.update({ where: { id: jobId }, data: { state: "RENDERING" } });

  return { repaired: true, actions: safeActions };
}

export async function getRepairHistory(jobId: string) {
  return prisma.auditLog.findMany({ where: { jobId, action: { contains: "repair" } }, orderBy: { createdAt: "asc" } });
}

export const MAX_REPAIRS = 2;
