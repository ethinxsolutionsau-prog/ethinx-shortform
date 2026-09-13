import { NextRequest, NextResponse } from "next/server";
import { createDelivery } from "@/lib/services/delivery";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const r = await createDelivery(params.id);
    return NextResponse.json({ ok: true, zipPath: r.zipPath, report: r.report });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
