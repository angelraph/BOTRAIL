import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseEvidenceFormData } from "@/lib/evidence-form";
import { saveEvidenceFile } from "@/lib/storage";
import { sha256Hex } from "@/lib/hash";
import { verifyEvidence, evaluateConditions } from "@/lib/ai/verify";
import { determineNewAssetStatus } from "@/lib/status-transition";
import { recordEvidenceOnChain, attemptReleaseOnChain, getAssetStatusOnChain } from "@/lib/chain/contracts";
import type { AiVerdict } from "@/lib/types";

function shortVerdictLabel(verdict: AiVerdict): string {
  if (verdict.criticalIssue) {
    const failed = verdict.checks.find((c) => !c.passed);
    return failed ? `critical:${failed.name}` : "critical_issue";
  }
  return "conditions_checked";
}

/// Evaluates evidence against a specific rental agreement's conditions
/// (e.g. delivery + inspection) and attempts to release escrowed funds.
/// This is the "Prove before you pay" enforcement path: evidence is
/// anchored on the asset first, then release is attempted — so if this
/// same evidence reveals a critical issue, the asset is already
/// RESTRICTED on-chain by the time SettlementEscrow checks it, and the
/// release is refused by the contract itself.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agreementId = Number(id);
  if (!Number.isInteger(agreementId)) {
    return NextResponse.json({ error: "invalid agreement id" }, { status: 400 });
  }

  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId }, include: { asset: true } });
  if (!agreement) {
    return NextResponse.json({ error: "agreement not found" }, { status: 404 });
  }
  if (agreement.status !== "FUNDED" || agreement.chainAgreementId == null) {
    return NextResponse.json({ error: `agreement is not FUNDED (status: ${agreement.status})` }, { status: 400 });
  }
  if (agreement.asset.chainAssetId == null) {
    return NextResponse.json({ error: "linked asset is not registered on-chain" }, { status: 400 });
  }

  const formData = await request.formData();
  const files = await parseEvidenceFormData(formData);
  if (files.length === 0) {
    return NextResponse.json({ error: "no evidence files provided" }, { status: 400 });
  }

  try {
    const savedPaths: string[] = [];
    const fileHashes: `0x${string}`[] = [];
    for (const f of files) {
      savedPaths.push(await saveEvidenceFile(agreement.assetId, f.fileName, f.buffer));
      fileHashes.push(sha256Hex(f.buffer));
    }

    const requiredConditions: { name: string; description: string }[] = JSON.parse(agreement.conditions);

    const verdict = await verifyEvidence({
      assetName: agreement.asset.name,
      assetType: agreement.asset.assetType,
      requiredConditions,
      files: files.map((f) => ({ fileName: f.fileName, mimeType: f.mimeType, buffer: f.buffer })),
    });

    const { conditionsMet } = evaluateConditions(
      verdict,
      requiredConditions.map((c) => c.name)
    );

    const combinedHash = sha256Hex(Buffer.concat(files.map((f) => f.buffer)));
    const chainAssetId = agreement.asset.chainAssetId;

    // Agreement-scoped evidence only ever proves *this* agreement's
    // conditions (delivery/inspection, not the asset's full health record),
    // so a clean result here must never clear an existing restriction —
    // only a full asset re-check (POST /api/assets/[id]/verify) can do that.
    const currentOnChainStatus = await getAssetStatusOnChain(chainAssetId);
    const newStatus = determineNewAssetStatus({
      criticalIssue: verdict.criticalIssue,
      isFullRecheck: false,
      currentStatus: currentOnChainStatus,
    });

    const { txHash: evidenceTxHash } = await recordEvidenceOnChain(
      chainAssetId,
      combinedHash,
      shortVerdictLabel(verdict),
      newStatus
    );

    if (newStatus !== agreement.asset.status) {
      await prisma.asset.update({ where: { id: agreement.assetId }, data: { status: newStatus } });
    }

    const { released, txHash: releaseTxHash } = await attemptReleaseOnChain(
      agreement.chainAgreementId,
      combinedHash,
      conditionsMet
    );

    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreementId },
      data: released ? { status: "RELEASED", txHashRelease: releaseTxHash } : {},
      include: { asset: true },
    });

    await prisma.evidence.createMany({
      data: files.map((f, i) => ({
        assetId: agreement.assetId,
        agreementId,
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
      agreement: updatedAgreement,
      verdict,
      conditionsMet,
      released,
      txHash: { evidence: evidenceTxHash, release: releaseTxHash },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
