import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const decision = body.decision || "approve"; // approve | revise | reject
    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (job.state !== "HUMAN_REVIEW") {
      return NextResponse.json({ error: `Job not in HUMAN_REVIEW, is ${job.state}` }, { status: 400 });
    }

    if (decision === "approve") {
      await prisma.job.update({ where: { id: params.id }, data: { state: "APPROVED", releaseEligible: true, approvedAt: new Date(), approvedBy: body.approvedBy || "human", humanDecision: "approved" } });
      await logAudit(params.id, "approval:approved", { fromState: "HUMAN_REVIEW", toState: "APPROVED", payload: body });
      return NextResponse.json({ ok: true, state: "APPROVED", releaseEligible: true });
    } else if (decision === "revise") {
      await prisma.job.update({ where: { id: params.id }, data: { state: "REVISION", humanDecision: "revise" } });
      await logAudit(params.id, "approval:revise", { fromState: "HUMAN_REVIEW", toState: "REVISION", payload: body });
      return NextResponse.json({ ok: true, state: "REVISION" });
    } else if (decision === "reject") {
      await prisma.job.update({ where: { id: params.id }, data: { state: "ESCALATED", humanDecision: "reject", releaseEligible: false } });
      await logAudit(params.id, "approval:reject", { fromState: "HUMAN_REVIEW", toState: "ESCALATED", payload: body });
      return NextResponse.json({ ok: true, state: "ESCALATED" });
    }
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id }, include: { qaResults: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ state: job.state, releaseEligible: job.releaseEligible, approvedAt: job.approvedAt });
}
