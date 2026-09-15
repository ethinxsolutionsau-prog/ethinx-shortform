import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export async function POST(req: NextRequest){
  try{
    const b=await req.json();
    const name=b.business_name||b.businessName;
    const website=b.website||"";
    const email=b.contact_email||b.email||"";
    const score=b.score||b.score_0_100||0;
    const status=b.status||"scored";
    if(!name) return NextResponse.json({error:"business_name required"},{status:400});
    // check exists
    const existing:any=await prisma.$queryRawUnsafe(`SELECT id FROM video_closer_funnel WHERE business_name=$1 LIMIT 1`, name);
    if(existing && existing.length>0){
      await prisma.$executeRawUnsafe(`UPDATE video_closer_funnel SET score=$1, status=$2, updated_at=NOW() WHERE business_name=$3`, score, status, name);
      return NextResponse.json({ ok:true, updated: name });
    }
    await prisma.$executeRawUnsafe(`INSERT INTO video_closer_funnel (business_name, website, contact_email, score, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`, name, website, email, score, status);
    return NextResponse.json({ ok:true, inserted: name });
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500});}
}
