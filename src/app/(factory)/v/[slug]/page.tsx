import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getFunnel(slug: string) {
  // slug is business_slug-random
  // Find by sales_page_url containing slug
  const rows:any = await prisma.$queryRawUnsafe(`SELECT * FROM video_closer_funnel WHERE sales_page_url LIKE $1 LIMIT 1`, `%${slug}%`);
  if (!rows || rows.length===0) return null;
  return rows[0];
}

export default async function FunnelPage({ params }: { params: { slug: string } }) {
  const funnel = await getFunnel(params.slug);
  if (!funnel) notFound();
  // increment page_visits
  await prisma.$executeRawUnsafe(`UPDATE video_closer_funnel SET page_visits = COALESCE(page_visits,0)+1, updated_at=NOW() WHERE id=$1::uuid`, funnel.id);
  const businessName = funnel.business_name;
  const previewUrl = funnel.preview_video_url || `https://videos.ethinx.solutions/teasers/${params.slug}.mp4`;
  const salesUrl = funnel.sales_page_url;
  const paypal550 = `${process.env.NEXT_PUBLIC_PAYPAL_LINK_550 || process.env.NEXT_PUBLIC_PAYPAL_LINK_FOURPACK || "https://www.paypal.com/ncp/payment/A4Y67YLZJZQSW"}?custom=${encodeURIComponent(params.slug)}`;
  const paypal199 = `${process.env.NEXT_PUBLIC_PAYPAL_LINK_199 || process.env.NEXT_PUBLIC_PAYPAL_LINK_SINGLE || "https://www.paypal.com/ncp/payment/3U2WSMUELZL8Q"}?custom=${encodeURIComponent(params.slug)}`;
  const angle = funnel.preview_video_url ? "Your custom teaser" : "Transform your business";
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
          <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Personalized for {businessName}</div>
          <h1 className="text-3xl font-black mt-2">Your 15-sec preview is ready</h1>
          <p className="text-zinc-600 mt-2">We made this for {businessName} — {angle}. Get your videos — no subscription.</p>
          <div className="mt-6 aspect-[9/16] max-w-[360px] mx-auto bg-black rounded-xl overflow-hidden border">
            {previewUrl ? (
              <video src={previewUrl} controls poster="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm">Preview rendering...</div>
            )}
          </div>
          <div className="mt-2 text-xs text-zinc-500 text-center">Hosted at videos.ethinx.solutions • {previewUrl}</div>
          <div className="mt-8 grid gap-3">
            <a href={paypal550} className="inline-flex justify-center bg-black text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 relative">Get 4 Videos for $550 — BEST VALUE <span className="ml-2 bg-white text-black text-xs px-2 py-1 rounded-full font-black">BEST</span></a>
            <a href={paypal199} className="inline-flex justify-center bg-white border-2 border-zinc-900 text-zinc-900 px-6 py-4 rounded-xl font-bold text-lg hover:bg-zinc-50">Get 1 Video for $199</a>
            <div className="text-xs text-zinc-500 text-center">$199 for 1 video • $550 for 4 videos (BEST) • No subscription • ABN 60 578 933 517 • Adelaide, SA</div>
          </div>
          <div className="mt-6 text-xs text-zinc-500">Questions? Reply to your email or call EthinX Solutions. Unsubscribe via STOP.</div>
          <div className="mt-4 text-[10px] text-zinc-400">Funnel DB ID: {funnel.id} • Status: {funnel.status} • Visits: { (funnel.page_visits||0)+1 }</div>
        </div>
        <div className="mt-4 text-center text-xs text-zinc-500">
          <a href="/" className="underline">EthinX Solutions</a> • Privacy • Terms
        </div>
      </div>
    </div>
  );
}
