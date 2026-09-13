import { NextRequest, NextResponse } from "next/server";
import { renderAll } from "@/lib/services/renderer";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const videos = await renderAll(params.id);
    return NextResponse.json({ videos });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
