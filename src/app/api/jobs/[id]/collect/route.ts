import { NextRequest, NextResponse } from "next/server";
import { runCollector } from "@/lib/services/collector";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await runCollector(params.id);
    return NextResponse.json({ brandData: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
