import { NextRequest, NextResponse } from "next/server";
import { generateScripts, getScripts } from "@/lib/services/scriptEngine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const scripts = await getScripts(params.id);
  return NextResponse.json({ scripts });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const scripts = await generateScripts(params.id);
    return NextResponse.json({ scripts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
