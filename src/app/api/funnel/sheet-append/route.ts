import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import csv from "fs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const headers = ["business_name","website","google_maps_url","contact_email","contact_phone","score_0_100","evidence_json","proposed_angle","preview_hook","status","Approve","Reject","Hold","Notes","sales_page_url","preview_video_url","email_sent_at","page_visits","payment_status","stripe_checkout_url","jira_issue","created_at","updated_at"];
    // Mock sheet stored as CSV + DB
    const sheetPath = "/opt/ethinx/runtime/n8n_workflow_video_closer_mock_sheet.csv";
    const now = new Date().toISOString();
    const row = headers.map(h => {
      if (h === "created_at" || h === "updated_at") return now;
      if (h === "Approve" || h === "Reject" || h === "Hold") return "FALSE";
      if (h === "page_visits") return "0";
      if (h === "payment_status") return "pending";
      if (h === "status") return body.status || "scored";
      return body[h] || "";
    });
    // Append to CSV
    const line = row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
    fs.appendFileSync(sheetPath, line);

    // Also insert into funnel DB if score>70 and not exists
    if ((body.score_0_100 || body.score || 0) > 70) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO video_closer_funnel (business_name, website, contact_email, score, status, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
        ON CONFLICT DO NOTHING
      `, body.business_name, body.website || "", body.contact_email || "", body.score_0_100 || body.score || 0, body.status || "scored").catch(async e=>{
        // fallback without conflict
        const existing: any = await prisma.$queryRawUnsafe(`SELECT id FROM video_closer_funnel WHERE business_name=$1 LIMIT 1`, body.business_name);
        if (!existing || existing.length===0) {
          await prisma.$executeRawUnsafe(`INSERT INTO video_closer_funnel (business_name, website, contact_email, score, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`, body.business_name, body.website||"", body.contact_email||"", body.score_0_100||0, body.status||"scored");
        }
      });
    }
    // Try also ethinx DB via separate connection? For now just ethinx_shortform
    // Duplicate to ethinx DB via raw pg if needed (using same credentials but different db) - simplest via direct psql? Skip

    return NextResponse.json({ ok: true, appended: body.business_name });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
export async function GET() {
  const sheetPath = "/opt/ethinx/runtime/n8n_workflow_video_closer_mock_sheet.csv";
  if (!fs.existsSync(sheetPath)) return NextResponse.json({ rows: [] });
  const content = fs.readFileSync(sheetPath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  const headers = lines[0].split(",").map(h=>h.replace(/^"|"$/g,''));
  const rows = lines.slice(1).map(l=>{
    // naive csv parse
    const vals = l.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    // better: split by "," but handle quotes
    const parts = l.split('","').map((p,i)=> p.replace(/^"/,'').replace(/"$/,'').replace(/""/g,'"'));
    const obj:any={};
    headers.forEach((h,idx)=> obj[h]=parts[idx]||"");
    // convert booleans
    if (obj.Approve==="TRUE"||obj.Approve==="true") obj.Approve=true;
    if (obj.Reject==="TRUE") obj.Reject=true;
    if (obj.Hold==="TRUE") obj.Hold=true;
    obj.score_0_100 = parseInt(obj.score_0_100)||0;
    return obj;
  });
  return NextResponse.json({ rows });
}
