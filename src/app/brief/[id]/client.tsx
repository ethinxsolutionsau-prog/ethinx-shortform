"use client";
/* eslint-disable react/no-unescaped-entities */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BriefClient({ job, brief }: { job: any; brief: any }) {
  const router = useRouter();
  const [form, setForm] = useState<any>(brief || {});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  if (!brief)
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
        <div className="text-sm font-medium">No brief yet</div>
        <p className="text-sm text-zinc-500 mt-1">Run Collect and Build Brief from the job page.</p>
        <a href={`/jobs/${job.id}`} className="inline-flex mt-4 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium">
          Go to job
        </a>
      </div>
    );

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}/brief`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved" : j.error || "Save failed");
    setSaving(false);
  }
  async function approve() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${job.id}/brief/approve`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Approved" : j.error || "Approve failed");
    setSaving(false);
    if (res.ok) router.push(`/jobs/${job.id}`);
  }

  const proofs: any[] = form.verified_proof || [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">The plan</h2>
          <span className="text-xs text-zinc-500">Edit what you need</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Business name</span>
            <input value={form.business?.name || ""} onChange={(e) => setForm({ ...form, business: { ...form.business, name: e.target.value } })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
            <span className="text-xs text-zinc-500">{form.business?.url}</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Call to action</span>
            <input value={form.cta || ""} onChange={(e) => setForm({ ...form, cta: e.target.value })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Who it&apos;s for</span>
            <input value={form.audience?.target_customer || ""} onChange={(e) => setForm({ ...form, audience: { ...form.audience, target_customer: e.target.value } })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Where</span>
            <input value={form.audience?.target_location || ""} onChange={(e) => setForm({ ...form, audience: { ...form.audience, target_location: e.target.value } })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Main service</span>
          <input value={form.core_service || ""} onChange={(e) => setForm({ ...form, core_service: e.target.value })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Customer problem</span>
          <textarea value={form.customer_problem || ""} onChange={(e) => setForm({ ...form, customer_problem: e.target.value })} rows={2} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">After (the change)</span>
          <textarea value={form.transformation || ""} onChange={(e) => setForm({ ...form, transformation: e.target.value })} rows={2} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Offer</span>
            <input value={form.offer || ""} onChange={(e) => setForm({ ...form, offer: e.target.value })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Brand colors</span>
            <input value={(form.brand_colours || []).join(", ")} onChange={(e) => setForm({ ...form, brand_colours: e.target.value.split(",").map((s: string) => s.trim()) })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
            <div className="mt-2 flex gap-1.5">
              {(form.brand_colours || []).slice(0, 4).map((c: string, i: number) => (
                <span key={i} className="w-6 h-6 rounded-full border border-zinc-200" style={{ background: c }} title={c} />
              ))}
            </div>
          </label>
        </div>

        <div>
          <div className="text-sm font-medium">Proof we can use</div>
          <p className="text-xs text-zinc-500">Each fact has a source. We don’t make up reviews or prices.</p>
          <div className="mt-2 space-y-2 max-h-56 overflow-auto">
            {proofs.length === 0 ? (
              <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl p-3">No proof yet</div>
            ) : (
              proofs.map((p: any, i: number) => (
                <div key={i} className="border border-zinc-200 rounded-xl p-3 bg-zinc-50">
                  <div className="text-sm">{p.claim}</div>
                  <div className="text-xs text-zinc-500 font-mono truncate">{p.source_url}</div>
                  <div className="text-xs text-zinc-500">Seen {new Date(p.captured_at).toLocaleDateString()} • {p.verified ? "Verified" : "Not verified"}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Don’t say (blocked claims)</span>
          <input value={(form.prohibited_claims || []).join(", ")} onChange={(e) => setForm({ ...form, prohibited_claims: e.target.value.split(",").map((s: string) => s.trim()) })} className="mt-1 w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={save} disabled={saving} className="flex-1 border border-zinc-200 bg-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-zinc-50 disabled:opacity-50">
            Save
          </button>
          <button onClick={approve} disabled={saving} className="flex-1 bg-black text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50">
            Approve and make scripts
          </button>
        </div>
        {msg && <div className="text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">{msg}</div>}
        <p className="text-xs text-zinc-500">Until you approve, scripts are blocked.</p>
      </div>

      <div className="bg-zinc-900 text-white rounded-2xl p-4">
        <div className="text-sm font-semibold">What happens next?</div>
        <p className="text-xs text-zinc-400 mt-1">We write 4 scripts, match photos, render 9:16 videos, check them, then ask you to approve.</p>
      </div>
    </div>
  );
}
