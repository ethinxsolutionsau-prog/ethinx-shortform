"use client";
import { useEffect, useState } from "react";

type PaymentsConfig = {
  dodoEnabled: boolean;
  dodo: { single: number; fourPack: number; enabled: boolean };
  paypal: { single: string; fourPack: string; link: string };
  bank: { name: string; bsb: string; account: string };
};

export default function Payments({ jobId, compact = false }: { jobId?: string; compact?: boolean }) {
  const [cfg, setCfg] = useState<PaymentsConfig | null>(null);

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
  return (
    <div className="border rounded-xl p-4 bg-amber-50 border-amber-200">
      <h3 className="font-bold text-sm">Payment — Dodo KYC pending (PayPal / Bank Transfer)</h3>
      <p className="text-xs text-zinc-600 mt-1">Dodo Payments is installed but disabled until KYC is done. Use PayPal or bank transfer for now. {compact ? "" : "Delivery still fail-closed: requires HUMAN_REVIEW approval."}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="bg-white border rounded p-3">
          <div className="font-semibold text-xs">1. PayPal</div>
          <div className="text-[11px] text-zinc-600">Pay securely with PayPal. Put jobId in note.</div>
          <div className="flex gap-2 mt-2">
            <a href={cfg.paypal.single} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#0070BA] text-white text-xs text-center py-2 rounded font-medium hover:bg-[#003087]">
              PayPal $199 Single
            </a>
            <a href={cfg.paypal.fourPack} target="_blank" rel="noopener noreferrer" className="flex-1 bg-sky-600 text-white text-xs text-center py-2 rounded font-medium hover:bg-sky-700">
              PayPal $550 Four-Pack
            </a>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Links: {cfg.paypal.single} / {cfg.paypal.fourPack}</div>
          {jobId && <div className="text-[10px] font-mono bg-zinc-100 p-1 rounded mt-1">Reference: {jobId}</div>}
        </div>
        <div className="bg-white border rounded p-3">
          <div className="font-semibold text-xs">2. Bank Transfer</div>
          <div className="text-xs font-mono bg-zinc-900 text-green-300 p-2 rounded mt-1 leading-relaxed">
            <div>Bank: {cfg.bank.name}</div>
            <div>BSB: {cfg.bank.bsb}</div>
            <div>Account: {cfg.bank.account}</div>
            <div className="text-yellow-300">Reference: {jobId || "jobId (shown after creation)"}</div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Email receipt to hello@ethinx.solutions with jobId. Allow 1 business day to confirm.</div>
        </div>
      </div>
      <div className="text-[10px] text-zinc-500 mt-2">When DODO_ENABLED=true later, Dodo $199 / $550 will auto-appear. @dodopayments/opencode-plugin remains installed.</div>
    </div>
  );
}
