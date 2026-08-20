"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AssetSummary {
  id: number;
  name: string;
  chainAssetId: number | null;
  status: string;
  ownerAddress: string;
}

const inputClass =
  "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors";

export function NewAgreementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get("assetId");

  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [assetId, setAssetId] = useState(preselectedAssetId ?? "");
  const [amountBot, setAmountBot] = useState("8000");
  const [payerAddress, setPayerAddress] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data) => setAssets((data.assets ?? []).filter((a: AssetSummary) => a.chainAssetId != null)));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: Number(assetId),
          amountBot,
          payerAddress: payerAddress || undefined,
          payeeAddress: payeeAddress || undefined,
          conditions: [
            { name: "delivery_confirmed", description: "Delivery photo shows the correct asset delivered to site." },
            { name: "inspection_passed", description: "Inspection report shows the asset passed inspection." },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed to create agreement");
      router.push(`/agreements/${data.agreement.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <span className="inline-block rounded-full bg-accent-bg text-accent text-xs font-semibold px-2.5 py-1">
        Escrow
      </span>
      <h1 className="text-3xl font-bold tracking-tight mt-3 mb-2">New rental agreement</h1>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed">
        Funds are deposited into escrow now. They release only when delivery and inspection
        evidence satisfies both conditions and the asset is still active at the moment of
        release.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Asset</span>
          <select required value={assetId} onChange={(e) => setAssetId(e.target.value)} className={inputClass}>
            <option value="" disabled>
              Select a verified asset…
            </option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (#{a.chainAssetId}, {a.status})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Amount (BOT)</span>
          <input required value={amountBot} onChange={(e) => setAmountBot(e.target.value)} className={`${inputClass} tabular`} />
        </label>

        <div className="rounded-lg bg-pending-bg px-3.5 py-3 text-xs text-text leading-relaxed">
          Conditions: <strong>delivery_confirmed</strong> + <strong>inspection_passed</strong>, fixed for this
          demo. The escrow contract only releases funds if both pass and the asset is active.
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Payer address</span>
          <span className="text-xs text-text-muted -mt-1">Optional. Defaults to a demo renter address.</span>
          <input
            value={payerAddress}
            onChange={(e) => setPayerAddress(e.target.value)}
            placeholder="0x…"
            className={`${inputClass} font-mono text-xs`}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Payee address</span>
          <span className="text-xs text-text-muted -mt-1">Optional. Defaults to the asset owner.</span>
          <input
            value={payeeAddress}
            onChange={(e) => setPayeeAddress(e.target.value)}
            placeholder="0x…"
            className={`${inputClass} font-mono text-xs`}
          />
        </label>

        {error && <p className="text-sm text-restricted">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !assetId}
          className="mt-2 self-start rounded-full bg-accent hover:bg-accent-hover text-ink-on-accent px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {submitting ? "Funding escrow…" : "Create & fund agreement"}
        </button>
      </form>
    </div>
  );
}
