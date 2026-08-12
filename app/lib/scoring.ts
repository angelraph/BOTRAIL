import type { AiVerdict } from "./types";

/// Simple, explicit heuristics for the two headline numbers shown on an
/// asset's passport. Not a real risk model — deliberately transparent
/// rather than opaque, since the whole point of BOTRAIL is that every
/// number traces back to a concrete, inspectable reason.
export function verificationScore(verdict: AiVerdict): number {
  return Math.round(Math.max(0, Math.min(1, verdict.confidence)) * 100);
}

export function riskScore(verdict: AiVerdict): number {
  if (verdict.criticalIssue) return 85;
  const failedChecks = verdict.checks.filter((c) => !c.passed).length;
  const base = Math.round((1 - Math.max(0, Math.min(1, verdict.confidence))) * 50);
  return Math.min(100, base + failedChecks * 10);
}
