import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifySignedAddress } from "@/lib/wallet-verify";

// Demo placeholder owner address (Anvil's well-known local account #1) —
// used only when the request supplies no connected-wallet ownerAddress at
// all (e.g. scripted/API testing). Any request that does claim an
// ownerAddress must prove control of it via a wallet signature below.
const DEFAULT_OWNER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const name = body.name.trim();
  const assetType = typeof body.assetType === "string" && body.assetType.trim() ? body.assetType.trim() : undefined;

  let ownerAddress = DEFAULT_OWNER_ADDRESS;
  if (typeof body.ownerAddress === "string" && body.ownerAddress.trim()) {
    ownerAddress = body.ownerAddress.trim();
    const message = typeof body.message === "string" ? body.message : "";
    const signature = typeof body.signature === "string" ? body.signature : "";
    if (!verifySignedAddress(message, signature, ownerAddress)) {
      return NextResponse.json(
        { error: "wallet signature missing or invalid — connect a wallet and sign to register as this owner" },
        { status: 401 }
      );
    }
  }

  const asset = await prisma.asset.create({
    data: { name, assetType, ownerAddress },
  });

  return NextResponse.json({ asset }, { status: 201 });
}

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ assets });
}
