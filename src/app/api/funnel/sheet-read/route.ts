import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  const sheetPath = "/opt/ethinx/runtime/n8n_workflow_video_closer_mock_sheet.csv";
  if (!fs.existsSync(sheetPath)) return NextResponse.json({ rows: [] });
  const content = fs.readFileSync(sheetPath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  if (lines.length<2) return NextResponse.json({ rows: [] });
  const headers = lines[0].split(",").map(h=>h.replace(/^"|"$/g,'').trim());
  const rows = lines.slice(1).map(l=>{
    // split CSV respecting quotes: use simple state machine
    const parts:string[]=[];
    let cur=""; let inQ=false;
    for(let i=0;i<l.length;i++){
      const c=l[i];
      if(c==='"'){
        if(inQ && l[i+1]==='"'){cur+='"'; i++;}
        else inQ=!inQ;
      } else if(c===',' && !inQ){ parts.push(cur); cur=""; }
      else cur+=c;
    }
    parts.push(cur);
    const obj:any={};
    headers.forEach((h,idx)=> obj[h]=parts[idx]||"");
    if (obj.Approve==="TRUE"||obj.Approve==="true"||obj.Approve===true) obj.Approve=true; else if(obj.Approve==="FALSE") obj.Approve=false;
    if (obj.Reject==="TRUE") obj.Reject=true; else if(obj.Reject==="FALSE") obj.Reject=false;
    if (obj.Hold==="TRUE") obj.Hold=true; else if(obj.Hold==="FALSE") obj.Hold=false;
    obj.score_0_100 = parseInt(obj.score_0_100)||0;
    obj.page_visits = parseInt(obj.page_visits)||0;
    return obj;
  });
  return NextResponse.json({ rows, sheet_id: "1MockVideoCloser_398dd07148ca46ef", sheet_url: "https://docs.google.com/spreadsheets/d/1MockVideoCloser_398dd07148ca46ef" });
}
