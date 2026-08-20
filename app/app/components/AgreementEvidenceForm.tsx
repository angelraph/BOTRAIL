"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AiVerdict } from "@/lib/types";

const FIELDS: { kind: string; label: string; hint: string }[] = [
  { kind: "DELIVERY", label: "Delivery evidence", hint: "photo of the asset delivered on-site" },
  { kind: "INSPECTION", label: "Inspection report", hint: "pass/fail + notes" },
];

interface EvidenceResult {
  verdict: AiVerdict;
  conditionsMet: boolean;
  released: boolean;
  txHash: { evidence: string; release: string };
}

export function AgreementEvidenceForm({ agreementId }: { agreementId: number }) {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvidenceResult | null>(null);

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

      const res = await fetch(`/api/agreements/${agreementId}/evidence`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "evidence evaluation failed");
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
      <h2 className="text-lg font-semibold">Upload evidence &amp; attempt release</h2>
      <p className="text-xs text-text-secondary mb-5 leading-relaxed">
        The AI checks this evidence against the agreement&rsquo;s conditions. Funds only release if
        every condition passes <em>and</em> the asset is still active at the moment the smart
        contract checks. A critical issue found here restricts the asset first, before release is
        attempted.
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
          {submitting ? "Analyzing & attempting release…" : "Upload & attempt release"}
        </button>
      </form>

      {result && (
        <div className="mt-6 border-t border-border pt-5 text-sm">
          <div
            className={`mb-4 rounded-lg px-3.5 py-2.5 font-semibold ${
              result.released ? "bg-verified-bg text-verified" : "bg-restricted-bg text-restricted"
            }`}
          >
            {result.released ? "✓ Funds released" : "✗ Release refused by contract"}
          </div>
          <p className="mb-3">{result.verdict.explanation}</p>
          <ul className="flex flex-col gap-1.5 mb-3">
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
            <p className="rounded-lg bg-restricted-bg text-restricted font-semibold px-3.5 py-2.5 mb-3 text-sm">
              ⚠ Critical issue detected. Asset status restricted.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
