import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildBrief, updateBrief } from "@/lib/services/briefBuilder";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!job.brief) {
    // auto-build if not exists and brandData exists
    if (job.brandData) {
      const brief = await buildBrief(params.id);
      return NextResponse.json({ brief });
    }
    return NextResponse.json({ brief: null });
  }
  return NextResponse.json({ brief: job.brief, state: job.state, briefApprovedAt: job.briefApprovedAt });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const brief = await buildBrief(params.id);
    return NextResponse.json({ brief });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await updateBrief(params.id, body);
    return NextResponse.json({ brief: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
