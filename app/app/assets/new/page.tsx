"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors";

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
      <span className="inline-block rounded-full bg-accent-bg text-accent text-xs font-semibold px-2.5 py-1">
        Step 1 of 2
      </span>
      <h1 className="text-3xl font-bold tracking-tight mt-3 mb-2">Register an asset</h1>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed">
        Name the asset now. You&rsquo;ll upload ownership, insurance, inspection, and photo
        evidence on the next screen to verify it and register it on-chain.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Asset name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Excavator #2841"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Asset type</span>
          <input value={assetType} onChange={(e) => setAssetType(e.target.value)} className={inputClass} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Owner address</span>
          <span className="text-xs text-text-muted -mt-1">Optional. Defaults to a demo address.</span>
          <input
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            placeholder="0x…"
            className={`${inputClass} font-mono text-xs`}
          />
        </label>

        {error && <p className="text-sm text-restricted">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-full bg-accent hover:bg-accent-hover text-ink-on-accent px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {submitting ? "Creating…" : "Create asset"}
        </button>
      </form>
    </div>
  );
}
