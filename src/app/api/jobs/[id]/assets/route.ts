import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs";
import { logAudit } from "@/lib/services/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await req.formData();
    const files: File[] = [];
    for (const val of form.values()) {
      if (val instanceof File) files.push(val);
    }
    if (files.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 });
    if (files.length > 6) return NextResponse.json({ error: "Max 6 slots" }, { status: 400 });

    const uploadRoot = path.join(process.cwd(), "uploads", params.id);
    if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

    const saved: any[] = [];
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const dest = path.join(uploadRoot, file.name);
      fs.writeFileSync(dest, buf);
      const assetId = `manual-${Date.now()}-${file.name}`;
      const asset = await prisma.asset.create({
        data: {
          jobId: params.id,
          assetId,
          sourceUrl: `/uploads/${params.id}/${file.name}`,
          type: file.type.startsWith("video") ? "video" : "image",
          usage: "approved",
          qualityScore: 0.95,
          confidenceScore: 0.95,
          localPath: dest,
          manifest: { asset_id: assetId, source_url: `/uploads/${params.id}/${file.name}`, type: file.type, usage: "approved" } as any,
          provenance: { claim: `Manual upload ${file.name}`, source_url: "manual", captured_at: new Date().toISOString(), verified: true } as any,
        },
      });
      saved.push(asset);
      await logAudit(params.id, "asset:uploaded", { payload: { assetId, file: file.name } });
    }

    return NextResponse.json({ assets: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const assets = await prisma.asset.findMany({ where: { jobId: params.id } });
  return NextResponse.json({ assets });
}
