import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { StatusBadge } from "@/app/components/StatusBadge";
import { TxHash } from "@/app/components/TxHash";
import { AgreementEvidenceForm } from "@/app/components/AgreementEvidenceForm";

export const dynamic = "force-dynamic";

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agreementId = Number(id);
  if (!Number.isInteger(agreementId)) notFound();

  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { asset: true, evidence: { orderBy: { createdAt: "desc" } } },
  });
  if (!agreement) notFound();

  const conditions: { name: string; description: string }[] = JSON.parse(agreement.conditions);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Agreement #{agreement.chainAgreementId ?? agreement.id}
          </h1>
          <StatusBadge status={agreement.status} />
        </div>
        <p className="text-sm text-zinc-500">
          <Link href={`/assets/${agreement.asset.id}`} className="hover:underline">
            {agreement.asset.name}
          </Link>{" "}
          · {agreement.amountBot} BOT
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-sm flex flex-col gap-3">
        <Row label="Payer" value={agreement.payerAddress} mono />
        <Row label="Payee" value={agreement.payeeAddress} mono />
        <Row
          label="Conditions"
          value={
            <ul className="list-disc list-inside">
              {conditions.map((c) => (
                <li key={c.name}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-zinc-500"> — {c.description}</span>
                </li>
              ))}
            </ul>
          }
        />
        <Row label="Escrow funded tx" value={<TxHash hash={agreement.txHashCreate} />} />
        {agreement.txHashRelease && <Row label="Release tx" value={<TxHash hash={agreement.txHashRelease} />} />}
      </div>

      {agreement.status === "FUNDED" ? (
        <AgreementEvidenceForm agreementId={agreement.id} />
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-sm text-zinc-500">
          This agreement is {agreement.status.toLowerCase()} — no further release attempts possible.
        </div>
      )}

      {agreement.evidence.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <h2 className="font-medium mb-3">Evidence submitted to this agreement</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {agreement.evidence.map((e) => (
              <li key={e.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
                <span>
                  {e.kind} · {e.fileName}
                </span>
                <span className="flex items-center gap-3">
                  {e.conditionsMet != null && (
                    <span className={e.conditionsMet ? "text-emerald-600" : "text-red-600"}>
                      {e.conditionsMet ? "conditions met" : "conditions not met"}
                    </span>
                  )}
                  <TxHash hash={e.txHash} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={mono ? "font-mono text-xs break-all" : ""}>{value}</span>
    </div>
  );
}
