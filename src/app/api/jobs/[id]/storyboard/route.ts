import { NextRequest, NextResponse } from "next/server";
import { matchAssets } from "@/lib/services/assetMatcher";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await matchAssets(params.id);
    return NextResponse.json({ storyboard: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await matchAssets(params.id);
    return NextResponse.json({ storyboard: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
