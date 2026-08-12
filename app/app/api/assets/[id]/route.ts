import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) {
    return NextResponse.json({ error: "invalid asset id" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      evidence: { orderBy: { createdAt: "desc" } },
      agreements: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "asset not found" }, { status: 404 });
  }

  return NextResponse.json({ asset });
}
