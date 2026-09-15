"use client";
import { useEffect, useState } from "react";

type PaymentsConfig = {
  dodoEnabled: boolean;
  dodo: { single: number; fourPack: number; enabled: boolean };
  paypal: { single: string; fourPack: string; link: string };
  bank: { name: string; bsb: string; account: string };
};

export default function Payments({ jobId, compact = false, pack }: { jobId?: string; compact?: boolean; pack?: string }) {
  const [cfg, setCfg] = useState<PaymentsConfig | null>(null);
  const [markBusy, setMarkBusy] = useState(false);
  const [markMsg, setMarkMsg] = useState("");

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => setCfg(null));
  }, []);

  if (!cfg) return <div className="text-xs text-zinc-400">Loading payment options...</div>;

  if (cfg.dodoEnabled) {
    return (
      <div className="border rounded-xl p-4 bg-white">
        <h3 className="font-bold text-sm">Payment — Dodo Enabled</h3>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="border rounded p-3">
            <div className="font-bold">Single Video</div>
            <div className="text-2xl font-black">$199</div>
            <div className="text-xs text-zinc-500">1×15s vertical</div>
            <button className="mt-2 w-full bg-black text-white py-1.5 rounded text-xs">Pay with Dodo</button>
          </div>
          <div className="border-2 border-sky-600 rounded p-3 bg-sky-50">
            <div className="font-bold">Four-Pack</div>
            <div className="text-2xl font-black">$550</div>
            <div className="text-xs text-zinc-500">Save $246 • 4×15s</div>
            <button className="mt-2 w-full bg-sky-600 text-white py-1.5 rounded text-xs">Pay with Dodo</button>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 mt-2">Secure checkout via Dodo Payments. No subscription.</div>
      </div>
    );
  }

  // Dodo disabled — show PayPal + Bank
  // PayPal hosted buttons must include jobId for reconciliation (custom field)
  const paypalSingleUrl = jobId ? `${cfg.paypal.single}?custom_id=${encodeURIComponent(jobId)}&item_name=EthinX-${encodeURIComponent(jobId)}` : cfg.paypal.single;
  const paypalFourUrl = jobId ? `${cfg.paypal.fourPack}?custom_id=${encodeURIComponent(jobId)}&item_name=EthinX-${encodeURIComponent(jobId)}` : cfg.paypal.fourPack;

  async function markPaid() {
    if (!jobId) {
      setMarkMsg("Need jobId");
      return;
    }
    setMarkBusy(true);
    setMarkMsg("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMarkMsg(j.error || "Not in HUMAN_REVIEW");
      } else {
        setMarkMsg("Marked as paid → APPROVED");
        // also log to audit via dedicated endpoint
        await fetch(`/api/jobs/${jobId}/mark-paid`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: "paypal", jobId }) }).catch(() => {});
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (e: any) {
      setMarkMsg(e.message);
    }
    setMarkBusy(false);
  }

  return (
    <div className="border rounded-xl p-4 bg-amber-50 border-amber-200">
      <h3 className="font-bold text-sm">Payment — PayPal Live (Dodo disabled pending ID)</h3>
      <p className="text-xs text-zinc-600 mt-1">Dodo is installed (DODO_ENABLED=false). Pay with PayPal now. Bank transfer also available. Delivery stays locked until you approve. {compact ? "" : ""}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="bg-white border rounded p-3">
          <div className="font-semibold text-xs">1. PayPal — Live Hosted Buttons</div>
          <div className="text-[11px] text-zinc-600">Click to pay. Job ID is added as custom/ref so we can match it.</div>
          <div className="flex gap-2 mt-2">
            <a href={paypalSingleUrl} target="_blank" rel="noopener noreferrer" data-testid="paypal-single" className="flex-1 bg-[#0070BA] text-white text-xs text-center py-2.5 rounded-lg font-medium hover:bg-[#003087] border border-[#0070BA]">
              PayPal $199 Single
            </a>
            <a href={paypalFourUrl} target="_blank" rel="noopener noreferrer" data-testid="paypal-fourpack" className="flex-1 bg-sky-600 text-white text-xs text-center py-2.5 rounded-lg font-medium hover:bg-sky-700 border border-sky-600">
              PayPal $550 Four-Pack
            </a>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 font-mono break-all">Single: {paypalSingleUrl}</div>
          <div className="text-[10px] text-zinc-500 font-mono break-all">Four: {paypalFourUrl}</div>
          {jobId ? (
            <div className="text-[10px] font-mono bg-green-50 border border-green-200 text-green-700 p-1.5 rounded mt-2">Ref included: {jobId} (custom_id)</div>
          ) : (
            <div className="text-[10px] font-mono bg-zinc-100 p-1 rounded mt-2">Ref will be jobId after you create</div>
          )}
          <div className="text-[10px] text-zinc-500 mt-1">IDs: 3U2WSMUELZL8Q (single) • A4Y67YLZJZQSW (four-pack) — live, not sandbox.</div>
          {pack && <div className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded px-2 py-1 mt-2">Your pack: {pack === "single" ? "Single ($199)" : "Four-Pack ($550)"} — use the {pack === "single" ? "Single" : "Four-Pack"} button below</div>}
        </div>
        <div className="bg-white border rounded p-3">
          <div className="font-semibold text-xs">2. Bank Transfer</div>
          <div className="text-xs font-mono bg-zinc-900 text-green-300 p-2.5 rounded mt-1 leading-relaxed border border-zinc-700">
            <div>Bank: {cfg.bank.name}</div>
            <div>BSB: {cfg.bank.bsb}</div>
            <div>Account: {cfg.bank.account}</div>
            <div className="text-yellow-300 font-bold">Reference: {jobId || "jobId"}</div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2">Use Ref = jobId. Email receipt to hello@ethinx.solutions. 1 business day.</div>
          {jobId && <div className="text-[10px] font-mono bg-zinc-100 p-1.5 rounded mt-2 border">Copy Ref: {jobId}</div>}
        </div>
      </div>

      {jobId && (
        <div className="mt-4 bg-white border-2 border-black rounded-xl p-3">
          <div className="text-xs font-bold">Admin — after PayPal / bank paid</div>
          <p className="text-xs text-zinc-500">No IPN yet. Click to mark this job as paid and move to APPROVED. Logs to audit.</p>
          <button onClick={markPaid} disabled={markBusy} data-testid="mark-paid" className="mt-2 w-full bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50">
            {markBusy ? "Marking..." : "Mark as Paid → Approve (Admin)"}
          </button>
          {markMsg && <div className="text-xs mt-2 p-2 bg-zinc-50 border rounded font-mono">{markMsg}</div>}
        </div>
      )}

      <div className="text-[10px] text-zinc-500 mt-3">Live PayPal hosted buttons. Dodo UI hidden while DODO_ENABLED=false. When KYC done, set DODO_ENABLED=true to show Dodo $199/$550.</div>
    </div>
  );
}
