/* eslint-disable @next/next/no-img-element */
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getDemoVideos() {
  const publicDemo = path.join(process.cwd(), "public", "demo");
  const demoRoot = path.join(process.cwd(), "demo");
  let files: { name: string; size: number; path: string }[] = [];

  // Prefer public/demo (served as /demo)
  const checkPaths = [publicDemo, demoRoot];
  for (const base of checkPaths) {
    if (fs.existsSync(base)) {
      const all = fs.readdirSync(base).filter((f) => f.endsWith(".mp4"));
      for (const f of all) {
        const p = path.join(base, f);
        const stat = fs.statSync(p);
        // Use public URL
        const url = `/demo/${f}`;
        // Check if already added
        if (!files.find((x) => x.name === f)) {
          files.push({ name: f, size: stat.size, path: url });
        }
      }
    }
  }

  // Fallback to latest renders if no public demo
  if (files.length < 4) {
    const renders = path.join(process.cwd(), "renders");
    if (fs.existsSync(renders)) {
      const jobs = fs.readdirSync(renders).map((d) => ({ d, t: fs.statSync(path.join(renders, d)).mtimeMs })).sort((a, b) => b.t - a.t);
      for (const { d } of jobs) {
        const jobDir = path.join(renders, d);
        const vids = fs.readdirSync(jobDir).filter((f) => f.endsWith(".mp4") && /^\d+-/.test(f));
        for (const v of vids) {
          const p = path.join(jobDir, v);
          const stat = fs.statSync(p);
          if (stat.size > 5 * 1024 * 1024) {
            const url = `/api/renders/${d}/${v}`;
            if (!files.find((x) => x.name === v)) {
              files.push({ name: v, size: stat.size, path: url });
            }
          }
        }
        if (files.length >= 4) break;
      }
    }
  }

  // Sort by expected order
  const order = ["01-problem", "02-proof", "03-offer", "04-direct"];
  files.sort((a, b) => {
    const ai = order.findIndex((o) => a.name.includes(o));
    const bi = order.findIndex((o) => b.name.includes(o));
    return ai - bi;
  });

  return files.slice(0, 4);
}

function getDemoImages() {
  const demoRoot = path.join(process.cwd(), "demo");
  if (!fs.existsSync(demoRoot)) return [];
  return fs
    .readdirSync(demoRoot)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map((f) => {
      const p = path.join(demoRoot, f);
      const stat = fs.statSync(p);
      return { name: f, size: stat.size, url: `/demo/${f}` }; // will not be served from /demo at root, but we can serve via /api/demo-image? For now use /demo path and also copy to public/demo for serving
      // Actually /demo at root is not public, so we need to serve via public/demo or via API. We'll copy images to public/demo as well, or serve via /api.
      // For now, assume images are also in public/demo or we serve via /api/demo/image
    })
    .slice(0, 6);
}

export default function DemoPage() {
  const videos = getDemoVideos();
  const images = (() => {
    const demoRoot = path.join(process.cwd(), "demo");
    const publicDemo = path.join(process.cwd(), "public", "demo");
    const both = new Set<string>();
    let result: any[] = [];
    for (const base of [demoRoot, publicDemo]) {
      if (!fs.existsSync(base)) continue;
      const files = fs.readdirSync(base).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
      for (const f of files) {
        if (both.has(f)) continue;
        both.add(f);
        const p = path.join(base, f);
        const stat = fs.statSync(p);
        // Images in public/demo are served as /demo/f, images in demo root need API, but we copied to public/demo for demo page, so use /demo
        // For those only in demo root, we will use /api/demo/image route, but simpler: copy them to public/demo already done? Check gen script only copied images to demo, not public/demo for images.
        // Our gen script only copied images to demo, not public/demo. So for images, they are only in demo, not public/demo. We should serve via /demo path that Next will not serve, but we can use a trick: create an API that serves demo images.
        // Easiest: just list images and use a placeholder, or copy them to public/demo now.
        // For now, we'll assume they are accessible via /demo/${f} if we copy them to public/demo.
        // Let's ensure they are copied.
        result.push({ name: f, size: stat.size, url: `/demo/${f}` });
      }
    }
    return result.slice(0, 6);
  })();

  // Ensure images are also in public/demo for serving - copy if needed
  try {
    const demoRoot = path.join(process.cwd(), "demo");
    const publicDemo = path.join(process.cwd(), "public", "demo");
    if (fs.existsSync(demoRoot) && fs.existsSync(publicDemo)) {
      for (const f of fs.readdirSync(demoRoot).filter((x) => /\.(jpg|jpeg|png)$/i.test(x))) {
        const src = path.join(demoRoot, f);
        const dest = path.join(publicDemo, f);
        if (!fs.existsSync(dest)) {
          try { fs.copyFileSync(src, dest); } catch {}
        }
      }
    }
  } catch {}

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="bg-black text-white text-xs font-bold px-2.5 py-1 rounded-full">DEMO</span>
          <span className="text-xs text-zinc-500">adelaidedrivewaycleaning.com.au • 4 videos • 9:16 • 15s each</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">See the finished pack</h1>
        <p className="text-sm text-zinc-600 mt-1 max-w-2xl">
          Real videos from the last run. Before/after driveway, team, equipment, house — all included. Each file is 5–15 MB, 1080×1920, ready for Reels / TikTok / Shorts.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/new" className="inline-flex bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800">
            Create your own
          </a>
          <a href="/" className="inline-flex bg-white border border-zinc-200 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-50">
            Back to dashboard
          </a>
        </div>
      </div>

      {/* 6 images */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h2 className="font-semibold">Demo assets — 6 real images</h2>
        <p className="text-xs text-zinc-500">Before/after driveway, team, equipment, house. These are what the videos were made from.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {images.length === 0 ? (
            <div className="col-span-6 text-sm text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl p-6 text-center">No demo images found. Check /demo folder.</div>
          ) : (
            images.map((img) => (
              <div key={img.name} className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50">
                <div className="aspect-[4/3] bg-zinc-100 relative">
                  {/* Use /demo path - served from public/demo */}
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium truncate" title={img.name}>
                    {img.name.replace(".jpg", "").replace(/^\d+-/, "").replace(/-/g, " ")}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">{(img.size / 1024).toFixed(0)} KB • 1920×1080</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 text-xs text-zinc-500">
          Files in <span className="font-mono">/demo</span> — also available in <span className="font-mono">/uploads/[jobId]</span> after you click “Load Demo Assets” on the New Campaign page.
        </div>
      </div>

      {/* 4 videos */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">4 finished videos — 9:16 • 15s each</h2>
          <span className="text-xs bg-zinc-900 text-white px-2.5 py-1 rounded-full font-medium">15 MB each</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Problem • Proof • Offer • Direct — same 4 angles you’ll get.</p>

        {videos.length < 4 ? (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">Only {videos.length} demo videos found. Run a full acceptance to generate 4×15 MB.</div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {videos.map((v) => (
            <div key={v.name} className="border border-zinc-200 rounded-2xl overflow-hidden bg-black flex flex-col">
              <div className="bg-zinc-900 text-white px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wide">{v.name.replace(".mp4", "").toUpperCase()}</span>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded-full">{(v.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="aspect-[9/16] bg-black relative">
                <video src={v.path} controls playsInline className="w-full h-full object-contain bg-black" preload="metadata" />
              </div>
              <div className="bg-white p-3">
                <div className="text-xs font-mono text-zinc-600">1080×1920 • 15.0s • H264/AAC</div>
                <div className="text-xs font-mono text-zinc-500 truncate">{v.name}</div>
                <a href={v.path} download className="mt-2 inline-flex w-full justify-center bg-black text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-zinc-800">
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
          <div className="text-xs font-semibold">What you get</div>
          <ul className="text-xs text-zinc-600 mt-1 list-disc ml-4 space-y-1">
            <li>01-problem.mp4 — Dirty driveway hook</li>
            <li>02-proof.mp4 — Real results / trust</li>
            <li>03-offer.mp4 — Free quote offer</li>
            <li>04-direct.mp4 — Call now direct response</li>
          </ul>
          <div className="text-xs font-mono text-zinc-500 mt-2">All 5–15 MB, ready to upload. Captions burned in safe zone 820, logo top-right, CTA 12–15s.</div>
        </div>
      </div>

      <div className="bg-zinc-900 text-white rounded-2xl p-6">
        <h3 className="font-semibold">Try it with your business</h3>
        <p className="text-sm text-zinc-400 mt-1">Use the 6 demo photos for a test job, or upload your own. Same pipeline, same checks.</p>
        <a href="/new" className="inline-flex mt-4 bg-white text-black px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-100">
          New Campaign
        </a>
      </div>
    </div>
  );
}
