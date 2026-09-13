import { NextRequest, NextResponse } from "next/server";
import { runQA, getQaResults } from "@/lib/services/qa";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await runQA(params.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const results = await getQaResults(params.id);
  return NextResponse.json({ qaResults: results });
}
