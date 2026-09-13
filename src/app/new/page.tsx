"use client";
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Payments from "@/components/Payments";

type AssetPreview = { file: File; url: string; quality: number };

export default function NewCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<AssetPreview[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 6 - assets.length);
    const next: AssetPreview[] = arr.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      // simple quality score based on size + type (mock, real would be vision)
      quality: Math.min(0.95, 0.6 + (f.size % 500000) / 1000000),
    }));
    setAssets((prev) => [...prev, ...next].slice(0, 6));
  }, [assets.length]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeAt = (i: number) => setAssets((prev) => prev.filter((_, idx) => idx !== i));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      business_url: fd.get("business_url"),
      campaign_goal: fd.get("campaign_goal") || "quote_requests",
      target_location: fd.get("target_location"),
      target_customer: fd.get("target_customer"),
      primary_service: fd.get("primary_service"),
      offer: fd.get("offer"),
      output_formats: ["9:16"],
      asset_permission_confirmed: fd.get("asset_permission_confirmed") === "on",
      phone: (fd.get("phone") as string) || undefined,
      instagram_url: (fd.get("instagram_url") as string) || undefined,
      facebook_url: (fd.get("facebook_url") as string) || undefined,
    };
    Object.keys(payload).forEach((k) => payload[k] === "" && delete payload[k]);

    const res = await fetch("/api/campaigns/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error + " " + JSON.stringify(json.details || ""));
      setLoading(false);
      return;
    }
    const jobId = json.jobId as string;

    // upload assets if any (up to 6)
    if (assets.length > 0) {
      const upFd = new FormData();
      assets.forEach((a) => upFd.append("file", a.file));
      await fetch(`/api/jobs/${jobId}/assets`, { method: "POST", body: upFd }).catch(() => {});
    }

    router.push(`/jobs/${jobId}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight">New Campaign</h1>
        <p className="text-sm text-zinc-600 mt-1">Add your business. Upload photos or video if you have them. We handle the rest.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          {/* Business URL */}
          <div>
            <label className="text-sm font-medium">Business URL *</label>
            <input name="business_url" required placeholder="https://adelaidedrivewaycleaning.com.au" defaultValue="https://adelaidedrivewaycleaning.com.au" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            <p className="text-xs text-zinc-500 mt-1">We copy what’s on your site. No guessing.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Business name</label>
              <input name="business_name" placeholder="Adelaide Driveway Cleaning" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input name="phone" placeholder="08 8123 4567" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Target location *</label>
              <input name="target_location" required defaultValue="Adelaide" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Who is it for? *</label>
              <input name="target_customer" required defaultValue="homeowners" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Main service *</label>
              <input name="primary_service" required defaultValue="driveway cleaning" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Offer *</label>
              <input name="offer" required defaultValue="free quote" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Goal</label>
            <select name="campaign_goal" className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm bg-white">
              <option value="quote_requests">Get quote requests</option>
              <option value="bookings">Get bookings</option>
              <option value="calls">Get calls</option>
              <option value="leads">Get leads</option>
            </select>
          </div>

          {/* Demo */}
          <div className="bg-zinc-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Try with demo photos</div>
              <div className="text-xs text-zinc-400">6 real driveway images — before/after, team, gear, house</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const demoFiles = ["01-before-driveway.jpg", "02-after-driveway.jpg", "03-team.jpg", "04-equipment.jpg", "05-house.jpg", "06-closeup.jpg"];
                const loaded: AssetPreview[] = [];
                for (const name of demoFiles) {
                  try {
                    const res = await fetch(`/demo/${name}`);
                    const blob = await res.blob();
                    const file = new File([blob], name, { type: blob.type || "image/jpeg" });
                    loaded.push({ file, url: URL.createObjectURL(file), quality: 0.92 });
                  } catch {}
                }
                setAssets((prev) => [...prev, ...loaded].slice(0, 6));
              }}
              className="inline-flex bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-100 shrink-0"
            >
              Load Demo Assets
            </button>
          </div>
          <p className="text-xs text-zinc-500">Copies <span className="font-mono">/demo</span> → <span className="font-mono">/uploads/[demo-job-id]</span> on next step (via <span className="font-mono">POST /api/demo/load</span> after create).</p>

          {/* Upload */}
          <div>
            <label className="text-sm font-medium">Photos / video (up to 6)</label>
            <p className="text-xs text-zinc-500">Drag and drop. We show a quality score for each.</p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`mt-2 border-2 border-dashed rounded-2xl p-6 text-center transition ${dragOver ? "border-black bg-zinc-50" : "border-zinc-200 bg-zinc-50/50"}`}
            >
              <div className="text-sm font-medium">Drop files here</div>
              <div className="text-xs text-zinc-500 mt-1">or click to choose</div>
              <label className="inline-flex mt-3 bg-white border border-zinc-200 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer hover:bg-zinc-50">
                Choose files
                <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
              </label>
              <div className="text-xs text-zinc-500 mt-2">{assets.length}/6 files</div>
            </div>

            {assets.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {assets.map((a, i) => (
                  <div key={i} className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                    <div className="aspect-square bg-zinc-100 relative">
                      {a.file.type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={a.url} className="w-full h-full object-cover" muted />
                      )}
                      <button type="button" onClick={() => removeAt(i)} className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        Remove
                      </button>
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium truncate">{a.file.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black" style={{ width: `${Math.round(a.quality * 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono">{a.quality.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500">Quality score</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-3">
            <input type="checkbox" name="asset_permission_confirmed" className="mt-0.5" />
            <span>I confirm I can use these photos/video. If not checked, we keep them private until you approve.</span>
          </label>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}

          <button disabled={loading} className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 transition">
            {loading ? "Creating..." : "Create Campaign"}
          </button>

          <p className="text-xs text-zinc-500 text-center">Takes 2 seconds. Then you’ll see progress.</p>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <Payments compact />
      </div>
    </div>
  );
}
