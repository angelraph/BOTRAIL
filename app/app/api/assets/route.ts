import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Demo placeholder owner address (Anvil's well-known local account #1) —
// used when no ownerAddress is supplied. On a real deployment this would
// be the equipment owner's connected wallet address instead.
const DEFAULT_OWNER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const asset = await prisma.asset.create({
    data: {
      name: body.name.trim(),
      assetType: typeof body.assetType === "string" && body.assetType.trim() ? body.assetType.trim() : undefined,
      ownerAddress:
        typeof body.ownerAddress === "string" && body.ownerAddress.trim()
          ? body.ownerAddress.trim()
          : DEFAULT_OWNER_ADDRESS,
    },
  });

  return NextResponse.json({ asset }, { status: 201 });
}

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ assets });
}
