import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" }, include: { videos: true, scripts: true } });
  return NextResponse.json({ jobs });
}
