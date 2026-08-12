import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { StatusBadge } from "@/app/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function Home() {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="text-zinc-500 mt-1 max-w-2xl text-sm">
          Continuously verified real-world assets. Evidence in, on-chain state and payment
          conditions out — the AI never moves funds, it only ever proposes a verdict that a
          smart contract enforces.
        </p>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-zinc-500">
          No assets registered yet.{" "}
          <Link href="/assets/new" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
            Register your first asset →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-xs text-zinc-500">{asset.assetType}</div>
                </div>
                <StatusBadge status={asset.status} />
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <div className="text-zinc-500 text-xs">Verification</div>
                  <div className="font-medium">{asset.verification != null ? `${asset.verification}%` : "—"}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Risk score</div>
                  <div className="font-medium">{asset.riskScore != null ? `${asset.riskScore}/100` : "—"}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">On-chain</div>
                  <div className="font-medium">{asset.chainAssetId != null ? `#${asset.chainAssetId}` : "not yet"}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
