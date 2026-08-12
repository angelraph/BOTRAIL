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
      <h1 className="text-2xl font-semibold tracking-tight mb-1">New Rental Agreement</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Funds are deposited into escrow now. They release only when delivery + inspection
        evidence satisfies both conditions AND the asset is still ACTIVE at the moment of
        release.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Asset</span>
          <select
            required
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          >
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

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Amount (BOT)</span>
          <input
            required
            value={amountBot}
            onChange={(e) => setAmountBot(e.target.value)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
        </label>

        <div className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
          Conditions: <strong>delivery_confirmed</strong> + <strong>inspection_passed</strong>{" "}
          (fixed for this demo — the escrow contract only releases if both pass and the asset is
          ACTIVE).
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Payer address (optional)</span>
          <input
            value={payerAddress}
            onChange={(e) => setPayerAddress(e.target.value)}
            placeholder="0x… (defaults to a demo renter address)"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-xs"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Payee address (optional)</span>
          <input
            value={payeeAddress}
            onChange={(e) => setPayeeAddress(e.target.value)}
            placeholder="0x… (defaults to the asset owner)"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-xs"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !assetId}
          className="mt-2 self-start rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Funding escrow…" : "Create & fund agreement"}
        </button>
      </form>
    </div>
  );
}
