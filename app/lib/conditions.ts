import type { EvidenceKind } from "./types";

/// Maps an asset-health evidence kind onto the condition the AI layer
/// should evaluate for it. Used by /api/assets/[id]/verify — whichever
/// kinds are uploaded in a given call become that call's required
/// conditions, so the same endpoint handles both the initial 4-document
/// registration and a later single-document re-check (e.g. re-uploading
/// an insurance certificate).
export const KIND_TO_CONDITION: Partial<Record<EvidenceKind, { name: string; description: string }>> = {
  OWNERSHIP: {
    name: "ownership_verified",
    description: "The ownership document clearly names an owner and matches the asset being registered.",
  },
  INSURANCE: {
    name: "insurance_valid",
    description: "An insurance certificate is present, legible, and not expired as of today's date.",
  },
  INSPECTION: {
    name: "inspection_passed",
    description: "The inspection report indicates the asset passed inspection with no disqualifying defects.",
  },
  PHOTO: {
    name: "photo_matches_asset",
    description: "The photo plausibly shows the described asset in a reasonable operating condition.",
  },
};
