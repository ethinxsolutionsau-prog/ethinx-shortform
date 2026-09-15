import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Log manual payment mark to audit
    await logAudit(params.id, "payment:mark-paid", {
      actor: body.actor || "admin",
      payload: {
        method: body.method || "paypal_manual",
        jobId: params.id,
        amount: body.amount,
        paidAt: body.paidAt || new Date().toISOString(),
        note: "Manual Mark as Paid - PayPal/Bank transfer confirmed by admin (no IPN)",
        ...body,
      },
    });

    // If job is in HUMAN_REVIEW, also ensure it's marked as paid in audit; the main state transition is handled by /approve
    // This endpoint is for logging only, but we also allow it to move to APPROVED if needed for convenience
    if (job.state === "HUMAN_REVIEW" && body.autoApprove !== false) {
      // Do not auto-approve here, let Payments component call /approve separately, just log
    }

    return NextResponse.json({ ok: true, logged: true, jobId: params.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
