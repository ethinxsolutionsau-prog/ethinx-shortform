"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BriefClient({ job, brief }: { job: any; brief: any }) {
  const router = useRouter();
  const [form, setForm] = useState<any>(brief || {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  if (!brief) return <div className="bg-white border rounded-xl p-6 text-sm">No brief yet — run Collector then Brief Builder from <a href={`/jobs/${job.id}`} className="text-sky-600 underline">pipeline</a>.</div>;

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}/brief`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json();
    setMsg(res.ok ? "Saved" : j.error);
    setSaving(false);
  }
  async function approve() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}/brief/approve`, { method: "POST" });
    const j = await res.json();
    setMsg(res.ok ? "Approved → SCRIPTING" : j.error);
    setSaving(false);
    if (res.ok) router.push(`/jobs/${job.id}`);
  }

  return (
    <div className="bg-white border rounded-xl p-6 space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-medium">Business</label>
          <input value={form.business?.name || ""} onChange={(e) => setForm({ ...form, business: { ...form.business, name: e.target.value } })} className="w-full border rounded px-2 py-1 mt-1" />
          <div className="text-[10px] text-zinc-500">{form.business?.url}</div>
        </div>
        <div>
          <label className="font-medium">CTA</label>
          <input value={form.cta || ""} onChange={(e) => setForm({ ...form, cta: e.target.value })} className="w-full border rounded px-2 py-1 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-medium">Audience - Customer</label>
          <input value={form.audience?.target_customer || ""} onChange={(e) => setForm({ ...form, audience: { ...form.audience, target_customer: e.target.value } })} className="w-full border rounded px-2 py-1 mt-1" />
        </div>
        <div>
          <label className="font-medium">Audience - Location</label>
          <input value={form.audience?.target_location || ""} onChange={(e) => setForm({ ...form, audience: { ...form.audience, target_location: e.target.value } })} className="w-full border rounded px-2 py-1 mt-1" />
        </div>
      </div>
      <div>
        <label className="font-medium">Core Service</label>
        <input value={form.core_service || ""} onChange={(e) => setForm({ ...form, core_service: e.target.value })} className="w-full border rounded px-2 py-1 mt-1" />
      </div>
      <div>
        <label className="font-medium">Customer Problem</label>
        <textarea value={form.customer_problem || ""} onChange={(e) => setForm({ ...form, customer_problem: e.target.value })} className="w-full border rounded px-2 py-1 mt-1" rows={2} />
      </div>
      <div>
        <label className="font-medium">Transformation</label>
        <textarea value={form.transformation || ""} onChange={(e) => setForm({ ...form, transformation: e.target.value })} className="w-full border rounded px-2 py-1 mt-1" rows={2} />
      </div>
      <div>
        <label className="font-medium">Offer</label>
        <input value={form.offer || ""} onChange={(e) => setForm({ ...form, offer: e.target.value })} className="w-full border rounded px-2 py-1 mt-1" />
      </div>
      <div>
        <label className="font-medium">Brand Colours</label>
        <input value={(form.brand_colours || []).join(", ")} onChange={(e) => setForm({ ...form, brand_colours: e.target.value.split(",").map((s: string) => s.trim()) })} className="w-full border rounded px-2 py-1 mt-1" />
      </div>
      <div>
        <label className="font-medium">Verified Proof (provenance)</label>
        <pre className="bg-zinc-900 text-green-300 p-2 rounded text-xs overflow-auto max-h-32">{JSON.stringify(form.verified_proof, null, 2)}</pre>
      </div>
      <div>
        <label className="font-medium">Prohibited Claims</label>
        <input value={(form.prohibited_claims || []).join(", ")} onChange={(e) => setForm({ ...form, prohibited_claims: e.target.value.split(",") })} className="w-full border rounded px-2 py-1 mt-1" />
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="border px-4 py-2 rounded hover:bg-zinc-50 disabled:opacity-50">Save</button>
        <button onClick={approve} disabled={saving} className="bg-sky-600 text-white px-6 py-2 rounded font-medium hover:bg-sky-700 disabled:opacity-50">Approve Brief → Scripting</button>
        <span className="text-xs py-2 text-zinc-500">{msg}</span>
      </div>
      <div className="text-xs text-zinc-500">Until approved, state=BRIEF_REVIEW. Script engine blocked.</div>
    </div>
  );
}
