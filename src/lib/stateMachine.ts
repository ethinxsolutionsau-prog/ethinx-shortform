import { JobState, STATE_TRANSITIONS } from "./types";

export function canTransition(from: JobState, to: JobState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: JobState, to: JobState) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition ${from} -> ${to}`);
  }
}

export const FAIL_CLOSED_STATES: JobState[] = [
  "INTAKE",
  "COLLECTING",
  "BRIEF_REVIEW",
  "SCRIPTING",
  "STORYBOARDING",
  "RENDERING",
  "QUALITY_REVIEW",
  "REPAIRING",
  "HUMAN_REVIEW",
  "ESCALATED",
  "REVISION",
  "FAILED",
];

export function isReleaseEligible(state: JobState, releaseEligible: boolean): boolean {
  return state === "APPROVED" && releaseEligible === true;
}

// State flow helper
export function nextStateAfterQa(passed: boolean, repairCount: number, maxRepairs: number): JobState {
  if (passed) return "HUMAN_REVIEW";
  if (repairCount < maxRepairs) return "REPAIRING";
  return "ESCALATED";
}
