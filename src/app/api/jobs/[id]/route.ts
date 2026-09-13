import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const job = (await prisma.job.findUnique({
    where: { id: params.id },
    include: { assets: true, scripts: true, videos: true, qaResults: true, auditLogs: true },
  } as any)) as any;
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ job });
}
