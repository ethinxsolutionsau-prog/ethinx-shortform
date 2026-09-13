import { NextRequest, NextResponse } from "next/server";
import { approveBrief } from "@/lib/services/briefBuilder";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await approveBrief(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
