/// Policy for how an asset's on-chain status is allowed to change from a
/// single evidence evaluation.
///
/// A RESTRICTED verdict always wins immediately — any critical issue
/// (expired insurance, mismatched asset, forged-looking document) should
/// restrict the asset right away regardless of what else was checked.
///
/// An ACTIVE verdict only clears an existing restriction if this
/// evaluation was a *full* re-check across all of the asset's core health
/// conditions (ownership, insurance, inspection, photo) — otherwise an
/// unrelated clean check (e.g. a delivery photo for one rental agreement)
/// could silently un-restrict an asset that's still, say, uninsured. A
/// partial clean check simply leaves the current status untouched.
export function determineNewAssetStatus(params: {
  criticalIssue: boolean;
  isFullRecheck: boolean;
  currentStatus: "ACTIVE" | "RESTRICTED";
}): "ACTIVE" | "RESTRICTED" {
  if (params.criticalIssue) return "RESTRICTED";
  if (params.isFullRecheck) return "ACTIVE";
  return params.currentStatus;
}
