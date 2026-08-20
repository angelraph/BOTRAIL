import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { StatusBadge } from "@/app/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <span className="inline-block rounded-full bg-accent-bg text-accent text-xs font-semibold px-2.5 py-1">
          Asset Registry
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-3 text-balance">Registered assets</h1>
        <p className="text-text-secondary mt-2 max-w-xl text-sm leading-relaxed">
          Every asset below carries a continuously updated on-chain passport. Upload evidence,
          the AI verifies it, and a smart contract, not the AI, decides what happens to
          payments.
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-text-secondary">
          No assets registered yet.{" "}
          <Link href="/assets/new" className="font-semibold text-accent hover:text-accent-hover">
            Register your first asset →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="group rounded-2xl border border-border hover:border-border-hover bg-surface p-6 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold leading-tight">{asset.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">{asset.assetType}</div>
                </div>
                <StatusBadge status={asset.status} />
              </div>
              <div className="mt-5 flex gap-6 text-sm border-t border-border pt-4">
                <div>
                  <div className="text-text-muted text-[11px] uppercase tracking-wide">Verification</div>
                  <div className="font-semibold tabular mt-0.5">
                    {asset.verification != null ? `${asset.verification}%` : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted text-[11px] uppercase tracking-wide">Risk score</div>
                  <div className="font-semibold tabular mt-0.5">
                    {asset.riskScore != null ? `${asset.riskScore}/100` : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted text-[11px] uppercase tracking-wide">On-chain</div>
                  <div className="font-semibold tabular mt-0.5">
                    {asset.chainAssetId != null ? `#${asset.chainAssetId}` : "not yet"}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
