"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AiVerdict } from "@/lib/types";
import { TxHash } from "@/app/components/TxHash";

const FIELDS: { kind: string; label: string; hint: string }[] = [
  { kind: "OWNERSHIP", label: "Ownership document", hint: "title, bill of sale, etc." },
  { kind: "INSURANCE", label: "Insurance certificate", hint: "must show an expiry date" },
  { kind: "INSPECTION", label: "Inspection report", hint: "pass/fail + notes" },
  { kind: "PHOTO", label: "Asset photo", hint: "image of the equipment" },
];

interface VerifyResult {
  verdict: AiVerdict;
  conditionsMet: boolean;
  txHash: { register?: string; evidence: string };
}

export function VerifyAssetForm({ assetId }: { assetId: number }) {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = Object.entries(files).filter(([, f]) => f) as [string, File][];
    if (selected.length === 0) {
      setError("Attach at least one evidence file.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      for (const [kind, file] of selected) formData.append(kind, file);

      const res = await fetch(`/api/assets/${assetId}/verify`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "verification failed");
      setResult(data);
      setFiles({});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold">Verify asset</h2>
      <p className="text-xs text-text-secondary mb-5 leading-relaxed">
        Upload any subset of these documents. The AI evaluates whatever you attach; uploading all
        four the first time registers the asset on-chain. Re-uploading a single document later
        (e.g. a renewed or expired insurance certificate) re-checks just that condition.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {FIELDS.map(({ kind, label, hint }) => (
          <label key={kind} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              {label} <span className="font-normal text-text-muted">({hint})</span>
            </span>
            <input
              type="file"
              onChange={(e) => setFiles((prev) => ({ ...prev, [kind]: e.target.files?.[0] ?? null }))}
              className="text-xs text-text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-surface-elevated file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-text"
            />
          </label>
        ))}

        {error && <p className="text-sm text-restricted">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-full bg-accent hover:bg-accent-hover text-ink-on-accent px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {submitting ? "Analyzing evidence…" : "Verify asset"}
        </button>
      </form>

      {result && (
        <div className="mt-6 border-t border-border pt-5 text-sm">
          <p className="mb-3 font-medium">{result.verdict.explanation}</p>
          <ul className="flex flex-col gap-1.5 mb-4">
            {result.verdict.checks.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span className={c.passed ? "text-verified" : "text-restricted"} aria-hidden="true">
                  {c.passed ? "✓" : "✗"}
                </span>
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-text-secondary">: {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          {result.verdict.criticalIssue && (
            <p className="rounded-lg bg-restricted-bg text-restricted font-semibold px-3.5 py-2.5 mb-4 text-sm">
              ⚠ Critical issue detected. Asset status restricted.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span className="tabular">confidence {Math.round(result.verdict.confidence * 100)}%</span>
            <span>·</span>
            {result.txHash.register && <span>new asset registered</span>}
            <TxHash hash={result.txHash.evidence} label="anchored" />
          </div>
        </div>
      )}
    </div>
  );
}
