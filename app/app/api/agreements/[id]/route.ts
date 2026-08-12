import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agreementId = Number(id);
  if (!Number.isInteger(agreementId)) {
    return NextResponse.json({ error: "invalid agreement id" }, { status: 400 });
  }

  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: {
      asset: true,
      evidence: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!agreement) {
    return NextResponse.json({ error: "agreement not found" }, { status: 404 });
  }

  return NextResponse.json({ agreement });
}
