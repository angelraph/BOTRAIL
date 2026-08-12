"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAssetPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("Construction Excavator");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, assetType, ownerAddress: ownerAddress || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed to create asset");
      router.push(`/assets/${data.asset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Register Asset</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Step 1 of BOTRAIL&rsquo;s asset passport: name the asset. You&rsquo;ll upload ownership,
        insurance, inspection, and photo evidence on the next screen to verify and register it
        on-chain.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Asset name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Excavator #2841"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Asset type</span>
          <input
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Owner address (optional)</span>
          <input
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            placeholder="0x… (defaults to a demo address)"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-xs"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create asset"}
        </button>
      </form>
    </div>
  );
}
