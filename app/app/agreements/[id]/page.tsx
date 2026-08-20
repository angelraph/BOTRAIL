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
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight tabular">
            Agreement #{agreement.chainAgreementId ?? agreement.id}
          </h1>
          <StatusBadge status={agreement.status} />
        </div>
        <p className="text-sm text-text-secondary mt-1">
          <Link href={`/assets/${agreement.asset.id}`} className="text-accent hover:text-accent-hover">
            {agreement.asset.name}
          </Link>{" "}
          · <span className="tabular">{agreement.amountBot} BOT</span>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 text-sm flex flex-col gap-5">
        <Row label="Payer" value={agreement.payerAddress} mono />
        <Row label="Payee" value={agreement.payeeAddress} mono />
        <Row
          label="Conditions"
          value={
            <ul className="list-disc list-inside space-y-0.5">
              {conditions.map((c) => (
                <li key={c.name}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-text-secondary">: {c.description}</span>
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
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-secondary">
          This agreement is {agreement.status.toLowerCase()}. No further release attempts possible.
        </div>
      )}

      {agreement.evidence.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">Evidence submitted</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {agreement.evidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <span>
                  {e.kind} · {e.fileName}
                </span>
                <span className="flex items-center gap-3">
                  {e.conditionsMet != null && (
                    <span className={`text-xs font-semibold ${e.conditionsMet ? "text-verified" : "text-restricted"}`}>
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
      <span className="text-[11px] uppercase tracking-wide text-text-muted">{label}</span>
      <span className={mono ? "font-mono text-xs break-all" : ""}>{value}</span>
    </div>
  );
}
