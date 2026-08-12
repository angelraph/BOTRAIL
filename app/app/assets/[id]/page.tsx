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
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
          <StatusBadge status={asset.status} />
        </div>
        <p className="text-sm text-zinc-500">
          {asset.assetType} · {asset.chainAssetId != null ? `on-chain asset #${asset.chainAssetId}` : "not yet registered on-chain"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Verification" value={asset.verification != null ? `${asset.verification}%` : "—"} />
        <Metric label="Risk score" value={asset.riskScore != null ? `${asset.riskScore}/100` : "—"} />
        <Metric label="Owner" value={asset.ownerAddress} mono />
      </div>

      <VerifyAssetForm assetId={asset.id} />

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Rental Agreements</h2>
          {asset.chainAssetId != null && (
            <Link
              href={`/agreements/new?assetId=${asset.id}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              + New agreement
            </Link>
          )}
        </div>
        {asset.agreements.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {asset.chainAssetId == null
              ? "Verify the asset first to enable rental agreements."
              : "No agreements yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {asset.agreements.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/agreements/${a.id}`}
                  className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-2 hover:border-zinc-400 dark:hover:border-zinc-600"
                >
                  <span className="text-sm">
                    {a.amountBot} BOT · agreement #{a.chainAgreementId ?? a.id}
                  </span>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="font-medium mb-3">Evidence history</h2>
        {asset.evidence.length === 0 ? (
          <p className="text-sm text-zinc-500">No evidence submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Kind</th>
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Result</th>
                  <th className="py-2 pr-4">Evidence hash</th>
                  <th className="py-2 pr-4">Anchor tx</th>
                </tr>
              </thead>
              <tbody>
                {asset.evidence.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-800/60 align-top">
                    <td className="py-2 pr-4 whitespace-nowrap text-zinc-500">
                      {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="py-2 pr-4">{e.kind}</td>
                    <td className="py-2 pr-4">{e.fileName}</td>
                    <td className="py-2 pr-4">
                      {e.newStatus ? <StatusBadge status={e.newStatus} /> : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="font-mono text-xs text-zinc-500">{e.sha256Hash.slice(0, 12)}…</span>
                    </td>
                    <td className="py-2 pr-4">
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

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 font-medium ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</div>
    </div>
  );
}
