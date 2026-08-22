import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { keccakOfString } from "@/lib/hash";
import { createAgreementOnChain } from "@/lib/chain/contracts";
import { verifySignedAddress } from "@/lib/wallet-verify";

interface ConditionSpec {
  name: string;
  description: string;
}

// Demo placeholder renter address (Anvil's well-known local account #2) —
// used only when the request supplies no connected-wallet payerAddress at
// all. Any request that does claim a payerAddress must prove control of
// it via a wallet signature below.
const DEFAULT_PAYER_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.assetId !== "number") {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }
  if (typeof body.amountBot !== "string" || body.amountBot.trim() === "") {
    return NextResponse.json({ error: "amountBot (decimal string, e.g. \"8000\") is required" }, { status: 400 });
  }
  const conditions: ConditionSpec[] = Array.isArray(body.conditions) ? body.conditions : [];
  if (conditions.length === 0) {
    return NextResponse.json({ error: "at least one condition is required" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({ where: { id: body.assetId } });
  if (!asset) {
    return NextResponse.json({ error: "asset not found" }, { status: 404 });
  }
  if (asset.chainAssetId == null) {
    return NextResponse.json(
      { error: "asset is not yet registered on-chain — verify it first via POST /api/assets/[id]/verify" },
      { status: 400 }
    );
  }

  const payerAddress = typeof body.payerAddress === "string" && body.payerAddress ? body.payerAddress : DEFAULT_PAYER_ADDRESS;
  const payeeAddress = typeof body.payeeAddress === "string" && body.payeeAddress ? body.payeeAddress : asset.ownerAddress;
  const conditionsHash = keccakOfString(JSON.stringify(conditions));

  if (typeof body.payerAddress === "string" && body.payerAddress) {
    const message = typeof body.message === "string" ? body.message : "";
    const signature = typeof body.signature === "string" ? body.signature : "";
    if (!verifySignedAddress(message, signature, payerAddress)) {
      return NextResponse.json(
        { error: "wallet signature missing or invalid — connect a wallet and sign to fund this agreement as this payer" },
        { status: 401 }
      );
    }
  }

  try {
    const agreement = await prisma.agreement.create({
      data: {
        assetId: asset.id,
        payerAddress,
        payeeAddress,
        amountBot: body.amountBot.trim(),
        conditions: JSON.stringify(conditions),
        conditionsHash,
      },
    });

    const { agreementId: chainAgreementId, txHash } = await createAgreementOnChain(
      asset.chainAssetId,
      payerAddress,
      payeeAddress,
      body.amountBot.trim(),
      conditionsHash
    );

    if (chainAgreementId == null) {
      return NextResponse.json({ error: "on-chain agreement creation did not return an agreementId" }, { status: 502 });
    }

    const updated = await prisma.agreement.update({
      where: { id: agreement.id },
      data: { chainAgreementId, status: "FUNDED", txHashCreate: txHash },
    });

    return NextResponse.json({ agreement: updated }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
