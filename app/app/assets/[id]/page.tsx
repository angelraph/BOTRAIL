import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { StatusBadge } from "@/app/components/StatusBadge";
import { TxHash } from "@/app/components/TxHash";
import { VerifyAssetForm } from "@/app/components/VerifyAssetForm";

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = Number(id);
  if (!Number.isInteger(assetId)) notFound();

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      evidence: { orderBy: { createdAt: "desc" } },
      agreements: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!asset) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-balance">{asset.name}</h1>
          <StatusBadge status={asset.status} />
        </div>
        <p className="text-sm text-text-secondary mt-1">
          {asset.assetType} ·{" "}
          {asset.chainAssetId != null ? (
            <span className="tabular">on-chain asset #{asset.chainAssetId}</span>
          ) : (
            "not yet registered on-chain"
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Verification" value={asset.verification != null ? `${asset.verification}%` : "-"} />
        <Metric
          label="Risk score"
          value={asset.riskScore != null ? `${asset.riskScore}/100` : "-"}
          tone={asset.riskScore == null ? undefined : asset.riskScore < 30 ? "good" : asset.riskScore < 70 ? "warn" : "bad"}
        />
        <Metric label="Owner" value={asset.ownerAddress} mono />
      </div>

      <VerifyAssetForm assetId={asset.id} />

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Rental agreements</h2>
          {asset.chainAssetId != null && (
            <Link href={`/agreements/new?assetId=${asset.id}`} className="text-sm font-semibold text-accent hover:text-accent-hover">
              + New agreement
            </Link>
          )}
        </div>
        {asset.agreements.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {asset.chainAssetId == null ? "Verify the asset first to enable rental agreements." : "No agreements yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {asset.agreements.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/agreements/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-border hover:border-border-hover px-4 py-3 transition-colors"
                >
                  <span className="text-sm tabular">
                    {a.amountBot} BOT · agreement #{a.chainAgreementId ?? a.id}
                  </span>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-4">Evidence history</h2>
        {asset.evidence.length === 0 ? (
          <p className="text-sm text-text-secondary">No evidence submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted border-b border-border">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Kind</th>
                  <th className="py-2 pr-4 font-medium">File</th>
                  <th className="py-2 pr-4 font-medium">Result</th>
                  <th className="py-2 pr-4 font-medium">Evidence hash</th>
                  <th className="py-2 pr-4 font-medium">Anchor tx</th>
                </tr>
              </thead>
              <tbody>
                {asset.evidence.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 align-top">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-text-muted tabular">
                      {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{e.kind}</td>
                    <td className="py-2.5 pr-4">
                      <a
                        href={`/api/evidence/${e.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent-hover hover:underline"
                      >
                        {e.fileName}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4">{e.newStatus ? <StatusBadge status={e.newStatus} /> : "-"}</td>
                    <td className="py-2.5 pr-4">
                      <span className="font-mono text-xs text-text-muted tabular">{e.sha256Hash.slice(0, 12)}…</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <TxHash hash={e.txHash} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "good" | "warn" | "bad";
}) {
  const toneClass = tone === "bad" ? "text-restricted" : tone === "warn" ? "text-pending" : tone === "good" ? "text-verified" : "";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1.5 font-semibold tabular ${toneClass} ${mono ? "font-mono text-xs break-all" : "text-lg"}`}>
        {value}
      </div>
    </div>
  );
}
