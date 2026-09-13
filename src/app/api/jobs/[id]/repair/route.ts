import { NextRequest, NextResponse } from "next/server";
import { attemptRepair } from "@/lib/services/repairController";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const r = await attemptRepair(params.id);
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
