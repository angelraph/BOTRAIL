// Shared string-literal unions. SQLite has no native enum support in
// Prisma, so `status`/`kind` columns are plain strings — these types are
// the single source of truth for what values are valid, enforced at the
// application layer instead of the DB layer.

export const ASSET_STATUS = ["PENDING", "ACTIVE", "RESTRICTED"] as const;
export type AssetStatus = (typeof ASSET_STATUS)[number];

export const EVIDENCE_KIND = [
  "OWNERSHIP",
  "INSURANCE",
  "INSPECTION",
  "PHOTO",
  "DELIVERY",
  "OTHER",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KIND)[number];

export const AGREEMENT_STATUS = [
  "PENDING",
  "FUNDED",
  "RELEASED",
  "REFUNDED",
] as const;
export type AgreementStatus = (typeof AGREEMENT_STATUS)[number];

/// On-chain AssetRegistry.Status enum order — must match
/// contracts/src/AssetRegistry.sol exactly (ACTIVE = 0, RESTRICTED = 1).
export const ON_CHAIN_ASSET_STATUS = ["ACTIVE", "RESTRICTED"] as const;

export interface EvidenceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/// Structured verdict returned by the AI evidence layer (lib/ai/verify.ts).
/// This is what gets hashed alongside the raw file and stored in
/// Evidence.aiVerdictJson — never raw model prose.
export interface AiVerdict {
  checks: EvidenceCheck[];
  confidence: number; // 0-1
  extractedFields: Record<string, string>;
  explanation: string;
  criticalIssue: boolean; // true for things like "insurance expired"
}
