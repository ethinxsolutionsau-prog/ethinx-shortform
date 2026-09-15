import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs";
export async function POST(req: NextRequest){
  try{
    const b=await req.json();
    const name=b.business_name||b.businessName;
    const preview=b.preview_video_url||b.preview_url||"";
    const sales=b.sales_page_url||b.salesUrl||"";
    const status=b.status||"preview_done";
    const payment_status=b.payment_status|| (status==='paid' || status==='delivered' ? 'paid' : undefined);
    const mc_gross=b.mc_gross||"";
    const txn_id=b.txn_id||"";
    const delivery_urls=b.delivery_urls||b.deliveryUrls||null;
    if(!name) return NextResponse.json({error:"business_name required"},{status:400});
    // Update with payment/delivery fields if provided
    if(delivery_urls){
      const deliveryJson = JSON.stringify(delivery_urls);
      // Try update, if 0 rows then insert (upsert for new business like Test Auto 4)
      const updated:any = await prisma.$executeRawUnsafe(`UPDATE video_closer_funnel SET preview_video_url=COALESCE(NULLIF($1::text,''), preview_video_url), sales_page_url=COALESCE(NULLIF($2::text,''), sales_page_url), status=$3::text, payment_status=COALESCE($4::text, payment_status), mc_gross=COALESCE(NULLIF($5::text,''), mc_gross), txn_id=COALESCE(NULLIF($6::text,''), txn_id), delivery_urls=$7::jsonb, updated_at=NOW() WHERE business_name=$8::text`, preview, sales, status, payment_status||'paid', String(mc_gross), String(txn_id), deliveryJson, name);
      // If no rows updated, insert new
      const check:any = await prisma.$queryRawUnsafe(`SELECT id FROM video_closer_funnel WHERE business_name=$1`, name);
      if(!check || check.length===0){
        await prisma.$executeRawUnsafe(`INSERT INTO video_closer_funnel (business_name, website, contact_email, score, status, sales_page_url, preview_video_url, payment_status, mc_gross, txn_id, delivery_urls, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb, NOW(), NOW())`, name, b.website||"", b.contact_email||"", b.score||0, status, sales||`http://localhost:3001/funnel/${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, preview||"", payment_status||'paid', String(mc_gross), String(txn_id), deliveryJson);
      }
      // Trigger delivery email via postiz 5000 if delivered
      if(status==='delivered'){
        try{
          const postizUrl = process.env.POSTIZ_URL || "http://localhost:5000";
          const gotifyToken = process.env.ETHINX_GOTIFY_APP_TOKEN || "gtfya.6j42kmWssIpljRJS_MDBJ3SIFSf1IeP3AlB6f3SqIU8";
          // Gotify
          await fetch(`http://127.0.0.1:8091/message?token=${gotifyToken}`, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({title:"Video Closer Delivered", message:`Delivered 4 videos for ${name} - ${delivery_urls.length} videos`, priority:5})}).catch(()=>{});
          // Postiz email (best effort)
          await fetch(`${postizUrl}/api/email/send`, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({to: b.contact_email || "", subject: `Your 4 videos are ready - ${name}`, html: `Hi ${name},<br>Your 4 videos for the $550 BEST VALUE package are ready:<br>${delivery_urls.map((u:string,i:number)=>`Video ${i+1}: <a href="${u}">${u}</a>`).join("<br>")}<br><br>ABN 60 578 933 517`})}).catch(()=>{});
        }catch(e){}
      }
    } else if(payment_status){
      await prisma.$executeRawUnsafe(`UPDATE video_closer_funnel SET preview_video_url=COALESCE(NULLIF($1::text,''), preview_video_url), sales_page_url=COALESCE(NULLIF($2::text,''), sales_page_url), status=$3::text, payment_status=$4::text, mc_gross=COALESCE(NULLIF($5::text,''), mc_gross), txn_id=COALESCE(NULLIF($6::text,''), txn_id), updated_at=NOW() WHERE business_name=$7::text`, preview, sales, status, payment_status, String(mc_gross), String(txn_id), name);
    } else {
      await prisma.$executeRawUnsafe(`UPDATE video_closer_funnel SET preview_video_url=$1::text, sales_page_url=$2::text, status=$3::text, updated_at=NOW() WHERE business_name=$4::text`, preview, sales, status, name);
    }
    // Also update mock sheet CSV
    const sheetPath="/opt/ethinx/runtime/n8n_workflow_video_closer_mock_sheet.csv";
    if(fs.existsSync(sheetPath)){
      let content=fs.readFileSync(sheetPath,"utf8");
      let lines=content.split("\n");
      const headers=lines[0].split(",").map(h=>h.replace(/^"|"$/g,'').trim());
      const idxName=headers.indexOf("business_name");
      const idxPreview=headers.indexOf("preview_video_url");
      const idxSales=headers.indexOf("sales_page_url");
      const idxStatus=headers.indexOf("status");
      const idxPayment=headers.indexOf("payment_status");
      const idxGross=headers.indexOf("mc_gross");
      const idxTxn=headers.indexOf("txn_id");
      const idxUpdated=headers.indexOf("updated_at");
      for(let i=1;i<lines.length;i++){
        if(!lines[i]) continue;
        // parse to find business_name
        const parts:string[]=[];
        let cur=""; let inQ=false;
        for(let j=0;j<lines[i].length;j++){
          const c=lines[i][j];
          if(c==='"'){
            if(inQ && lines[i][j+1]==='"'){cur+='"'; j++;}
            else inQ=!inQ;
          } else if(c===',' && !inQ){ parts.push(cur); cur=""; }
          else cur+=c;
        }
        parts.push(cur);
        if(parts[idxName]===name){
          if(preview) parts[idxPreview]=preview;
          if(sales) parts[idxSales]=sales;
          parts[idxStatus]=status;
          if(idxPayment>=0 && payment_status) parts[idxPayment]=payment_status;
          if(idxGross>=0 && mc_gross) parts[idxGross]=mc_gross;
          if(idxTxn>=0 && txn_id) parts[idxTxn]=txn_id;
          parts[idxUpdated]=new Date().toISOString();
          // rebuild line with quotes
          lines[i]=parts.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",");
          break;
        }
      }
      fs.writeFileSync(sheetPath, lines.join("\n"));
    }
    return NextResponse.json({ ok:true, business_name: name, sales_page_url: sales, preview_video_url: preview });
  }catch(e:any){ return NextResponse.json({error:e.message},{status:500});}
}
