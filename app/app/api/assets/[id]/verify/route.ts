import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseEvidenceFormData } from "@/lib/evidence-form";
import { saveEvidenceFile } from "@/lib/storage";
import { sha256Hex } from "@/lib/hash";
import { verifyEvidence, evaluateConditions } from "@/lib/ai/verify";
import { KIND_TO_CONDITION } from "@/lib/conditions";
import { verificationScore, riskScore } from "@/lib/scoring";
import { registerAssetOnChain, recordEvidenceOnChain, getAssetStatusOnChain } from "@/lib/chain/contracts";
import { determineNewAssetStatus } from "@/lib/status-transition";
import type { AiVerdict, EvidenceKind } from "@/lib/types";

const CORE_HEALTH_KINDS: EvidenceKind[] = ["OWNERSHIP", "INSURANCE", "INSPECTION", "PHOTO"];

/// Produces the short machine-readable label anchored on-chain alongside
/// the evidence hash (AssetRegistry.recordEvidence's `verdict` param) —
/// distinct from the full human-readable explanation, which stays off-chain
/// in Evidence.aiVerdictJson.
function shortVerdictLabel(verdict: AiVerdict): string {
  if (verdict.criticalIssue) {
    const failed = verdict.checks.find((c) => !c.passed);
    return failed ? `critical:${failed.name}` : "critical_issue";
  }
  return "verified_ok";
}

/// Registers evidence against an asset's health conditions (ownership,
/// insurance, inspection, photo). Handles BOTH the initial registration
/// (asset has no chainAssetId yet -> registers it on-chain first) and any
/// later re-check (e.g. re-uploading a renewed/expired insurance
/// certificate) through the same path.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) {
    return NextResponse.json({ error: "invalid asset id" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return NextResponse.json({ error: "asset not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = await parseEvidenceFormData(formData);
  if (files.length === 0) {
    return NextResponse.json({ error: "no evidence files provided (expected fields named OWNERSHIP/INSURANCE/INSPECTION/PHOTO/etc)" }, { status: 400 });
  }

  try {
    const savedPaths: string[] = [];
    const fileHashes: `0x${string}`[] = [];
    for (const f of files) {
      savedPaths.push(await saveEvidenceFile(assetId, f.fileName, f.buffer));
      fileHashes.push(sha256Hex(f.buffer));
    }

    const requiredConditions = [...new Set(files.map((f) => f.kind))]
      .map((kind) => KIND_TO_CONDITION[kind])
      .filter((c): c is { name: string; description: string } => Boolean(c));

    const verdict = await verifyEvidence({
      assetName: asset.name,
      assetType: asset.assetType,
      requiredConditions,
      files: files.map((f) => ({ fileName: f.fileName, mimeType: f.mimeType, buffer: f.buffer })),
    });

    const { conditionsMet } = evaluateConditions(
      verdict,
      requiredConditions.map((c) => c.name)
    );

    const combinedHash = sha256Hex(Buffer.concat(files.map((f) => f.buffer)));
    const uploadedKinds = new Set(files.map((f) => f.kind));
    const isFullRecheck = CORE_HEALTH_KINDS.every((k) => uploadedKinds.has(k));

    let chainAssetId = asset.chainAssetId;
    let registerTxHash: string | undefined;
    let currentOnChainStatus: "ACTIVE" | "RESTRICTED" = "ACTIVE"; // brand-new assets start ACTIVE on-chain
    if (chainAssetId == null) {
      const result = await registerAssetOnChain(asset.ownerAddress, asset.metadataURI || `botrail://asset/${asset.id}`);
      if (result.assetId == null) {
        return NextResponse.json({ error: "on-chain asset registration did not return an assetId" }, { status: 502 });
      }
      chainAssetId = result.assetId;
      registerTxHash = result.txHash;
    } else {
      currentOnChainStatus = await getAssetStatusOnChain(chainAssetId);
    }

    const newStatus = determineNewAssetStatus({
      criticalIssue: verdict.criticalIssue,
      isFullRecheck,
      currentStatus: currentOnChainStatus,
    });

    const { txHash: evidenceTxHash } = await recordEvidenceOnChain(
      chainAssetId,
      combinedHash,
      shortVerdictLabel(verdict),
      newStatus
    );

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        chainAssetId,
        status: newStatus,
        verification: verificationScore(verdict),
        riskScore: riskScore(verdict),
      },
    });

    await prisma.evidence.createMany({
      data: files.map((f, i) => ({
        assetId,
        kind: f.kind,
        fileName: f.fileName,
        filePath: savedPaths[i],
        sha256Hash: fileHashes[i],
        aiVerdictJson: JSON.stringify(verdict),
        conditionsMet,
        newStatus,
        txHash: evidenceTxHash,
      })),
    });

    return NextResponse.json({
      asset: updatedAsset,
      verdict,
      conditionsMet,
      txHash: { register: registerTxHash, evidence: evidenceTxHash },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
