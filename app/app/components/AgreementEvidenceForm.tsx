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
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <h2 className="font-medium mb-1">Upload Evidence &amp; Attempt Release</h2>
      <p className="text-xs text-zinc-500 mb-4">
        The AI checks this evidence against the agreement&rsquo;s conditions. Funds only release if
        every condition passes <em>and</em> the asset is still ACTIVE at the moment the smart
        contract checks — a critical issue found here restricts the asset first, before release is
        attempted.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {FIELDS.map(({ kind, label, hint }) => (
          <label key={kind} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              {label} <span className="font-normal text-zinc-400">({hint})</span>
            </span>
            <input
              type="file"
              onChange={(e) => setFiles((prev) => ({ ...prev, [kind]: e.target.files?.[0] ?? null }))}
              className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs"
            />
          </label>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Analyzing & attempting release…" : "Upload & attempt release"}
        </button>
      </form>

      {result && (
        <div className="mt-5 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-sm">
          <div
            className={`mb-3 rounded-md px-3 py-2 font-medium ${
              result.released
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
            }`}
          >
            {result.released ? "✓ Funds released" : "✗ Release refused by contract"}
          </div>
          <p className="mb-2">{result.verdict.explanation}</p>
          <ul className="flex flex-col gap-1 mb-2">
            {result.verdict.checks.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span className={c.passed ? "text-emerald-600" : "text-red-600"}>{c.passed ? "✓" : "✗"}</span>
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-zinc-500"> — {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          {result.verdict.criticalIssue && (
            <p className="text-red-600 font-medium mb-2">⚠ Critical issue detected — asset status restricted.</p>
          )}
        </div>
      )}
    </div>
  );
}
