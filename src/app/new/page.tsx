"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      phone: fd.get("phone") || undefined,
      instagram_url: fd.get("instagram_url") || undefined,
      facebook_url: fd.get("facebook_url") || undefined,
    };
    // Remove empty
    Object.keys(payload).forEach((k) => payload[k] === "" && delete payload[k]);

    const res = await fetch("/api/campaigns/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error + " " + JSON.stringify(json.details || ""));
      setLoading(false);
      return;
    }
    router.push(`/jobs/${json.jobId}`);
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border rounded-xl p-6">
      <h1 className="text-xl font-bold">New Campaign — Intake</h1>
      <p className="text-xs text-zinc-500">POST /api/campaigns/create • Minimum: business_url, campaign_goal, target_location, target_customer, primary_service, offer, output_formats, asset_permission_confirmed</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 text-sm">
        <div>
          <label className="font-medium">Business URL *</label>
          <input name="business_url" required placeholder="https://example.com" className="w-full border rounded px-3 py-2 mt-1" defaultValue="https://adelaidedrivewaycleaning.com.au" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-medium">Campaign Goal</label>
            <select name="campaign_goal" className="w-full border rounded px-3 py-2 mt-1">
              <option value="quote_requests">quote_requests</option>
              <option value="bookings">bookings</option>
              <option value="calls">calls</option>
              <option value="leads">leads</option>
            </select>
          </div>
          <div>
            <label className="font-medium">Target Location *</label>
            <input name="target_location" required className="w-full border rounded px-3 py-2 mt-1" defaultValue="Adelaide" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-medium">Target Customer *</label>
            <input name="target_customer" required className="w-full border rounded px-3 py-2 mt-1" defaultValue="homeowners" />
          </div>
          <div>
            <label className="font-medium">Primary Service *</label>
            <input name="primary_service" required className="w-full border rounded px-3 py-2 mt-1" defaultValue="driveway cleaning" />
          </div>
        </div>
        <div>
          <label className="font-medium">Offer *</label>
          <input name="offer" required className="w-full border rounded px-3 py-2 mt-1" defaultValue="free quote" />
        </div>
        <div>
          <label className="font-medium">Phone (optional - never invented)</label>
          <input name="phone" placeholder="08 8123 4567" className="w-full border rounded px-3 py-2 mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input name="instagram_url" placeholder="https://instagram.com/..." className="border rounded px-3 py-2" />
          <input name="facebook_url" placeholder="https://facebook.com/..." className="border rounded px-3 py-2" />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="asset_permission_confirmed" />
          asset_permission_confirmed (blocks public delivery if false)
        </label>
        <div className="text-xs bg-amber-50 border border-amber-200 rounded p-3">
          FAIL-CLOSED: If asset_permission_confirmed=false, uploads are private_mockup_only. Delivery requires release_eligible=true after human approval.
        </div>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <button disabled={loading} className="w-full bg-sky-600 text-white py-2.5 rounded font-medium hover:bg-sky-700 disabled:opacity-50">
          {loading ? "Creating..." : "Create → Collect → Build Brief"}
        </button>
      </form>
      <div className="text-xs text-zinc-400 mt-4">Next: Collector scans website + socials → Brief Builder → /brief/[jobId] for correction</div>
    </div>
  );
}
