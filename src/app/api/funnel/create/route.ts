import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const business_name = body.business_name || body.businessName;
    const preview_url = body.preview_url || body.previewUrl || body.preview_video_url || "";
    const angle = body.angle || body.proposed_angle || "Custom video package";

    if (!business_name) return NextResponse.json({ error: "business_name required" }, { status: 400 });

    const slug = business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2,6);
    const sales_page_url = `http://localhost:3001/funnel/${slug}`;
    const paypal_link_199 = `${process.env.NEXT_PUBLIC_PAYPAL_LINK_199 || process.env.PAYPAL_LINK_199 || process.env.NEXT_PUBLIC_PAYPAL_LINK_SINGLE || "https://www.paypal.com/ncp/payment/3U2WSMUELZL8Q"}?custom=${encodeURIComponent(slug)}`;
    const paypal_link_550 = `${process.env.NEXT_PUBLIC_PAYPAL_LINK_550 || process.env.PAYPAL_LINK_550 || process.env.NEXT_PUBLIC_PAYPAL_LINK_FOURPACK || "https://www.paypal.com/ncp/payment/A4Y67YLZJZQSW"}?custom=${encodeURIComponent(slug)}`;

    const preview_video_url = preview_url || `https://videos.ethinx.solutions/teasers/${slug}.mp4`;

    // Upsert into video_closer_funnel via raw SQL (prisma doesn't have model yet, use $executeRaw)
    await prisma.$executeRawUnsafe(`
      INSERT INTO video_closer_funnel (business_name, website, contact_email, score, status, sales_page_url, preview_video_url, payment_status, paypal_link_199, paypal_link_550, mc_gross, txn_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (business_name) DO UPDATE SET sales_page_url = EXCLUDED.sales_page_url, preview_video_url = EXCLUDED.preview_video_url, paypal_link_199 = EXCLUDED.paypal_link_199, paypal_link_550 = EXCLUDED.paypal_link_550, status = 'page_done', updated_at = NOW()
    `, business_name, body.website || "", body.contact_email || "", body.score || 0, "page_done", sales_page_url, preview_video_url, "pending", paypal_link_199, paypal_link_550, null, null).catch(async () => {
      // Fallback without ON CONFLICT if no unique constraint on business_name, just insert
      await prisma.$executeRawUnsafe(`
        INSERT INTO video_closer_funnel (business_name, website, contact_email, score, status, sales_page_url, preview_video_url, payment_status, paypal_link_199, paypal_link_550, mc_gross, txn_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      `, business_name, body.website || "", body.contact_email || "", body.score || 0, "page_done", sales_page_url, preview_video_url, "pending", paypal_link_199, paypal_link_550, null, null);
    });

    // Also ensure unique: update existing if exists
    await prisma.$executeRawUnsafe(`UPDATE video_closer_funnel SET sales_page_url=$1, preview_video_url=$2, paypal_link_199=$3, paypal_link_550=$4, status='page_done', updated_at=NOW() WHERE business_name=$5`, sales_page_url, preview_video_url, paypal_link_199, paypal_link_550, business_name);

    return NextResponse.json({ sales_page_url, preview_video_url, paypal_link_199, paypal_link_550, slug, business_name, payment_status: "pending" });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
