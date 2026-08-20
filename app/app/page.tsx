import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "Register & verify the asset",
    body: "An equipment owner uploads ownership papers, an insurance certificate, an inspection report, and a photo. The AI checks them against the asset and produces a structured verdict: pass or fail, per condition, with a reason for each.",
  },
  {
    n: "02",
    title: "Fund a rental agreement",
    body: "A renting company deposits payment into an on-chain escrow contract, tied to that specific asset and a fixed set of conditions: delivery confirmed, inspection passed.",
  },
  {
    n: "03",
    title: "Prove it, then get paid",
    body: "Delivery and inspection evidence comes in. The AI checks it against the agreement's conditions. If everything passes and the asset is still active, the escrow contract releases payment automatically, with no manual approval step.",
  },
  {
    n: "04",
    title: "Reality changes, the contract reacts",
    body: "If a later document reveals a problem, such as an insurance policy that lapsed, the asset is restricted on-chain immediately. Any pending or future payment on that asset is refused by the contract itself, even if that specific payment's own evidence looks clean.",
  },
];

export default async function LandingPage() {
  const assetCount = await prisma.asset.count();

  return (
    <div className="flex flex-col gap-24">
      {/* Hero */}
      <section className="flex flex-col gap-6 pt-6">
        <span className="inline-flex w-fit items-center rounded-full bg-accent-bg text-accent text-xs font-semibold px-2.5 py-1">
          Live on BOT Chain Mainnet
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance max-w-2xl">
          Prove before you pay.
        </h1>
        <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-xl">
          BOTRAIL turns construction equipment into a continuously verified, on-chain asset.
          Real-world evidence goes in: ownership papers, insurance, inspections, photos. An
          AI-checked, contract-enforced payment decision comes out. The AI never moves funds; a
          smart contract does, and only when its conditions are actually met.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <Link
            href="/assets/new"
            className="rounded-full bg-accent hover:bg-accent-hover px-5 py-2.5 text-sm font-semibold text-ink-on-accent transition-colors"
          >
            Register an asset
          </Link>
          <Link
            href="/assets"
            className="rounded-full border border-border hover:border-border-hover px-5 py-2.5 text-sm font-semibold text-text transition-colors"
          >
            View asset registry
          </Link>
          {assetCount > 0 && (
            <span className="text-sm text-text-muted tabular">
              {assetCount} asset{assetCount === 1 ? "" : "s"} registered
            </span>
          )}
        </div>
      </section>

      {/* The boundary */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">The AI</div>
          <h2 className="text-xl font-bold mt-2">Proposes a verdict</h2>
          <p className="text-text-secondary text-sm leading-relaxed mt-2">
            Reads documents and photos, checks them against a fixed set of conditions, and
            returns a structured result: which conditions passed, why, and whether anything looks
            critical. It never calls a contract function and never holds funds.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">The contract</div>
          <h2 className="text-xl font-bold mt-2">Enforces the outcome</h2>
          <p className="text-text-secondary text-sm leading-relaxed mt-2">
            A deterministic rule, not the AI, decides whether an asset&rsquo;s on-chain status
            changes and whether escrowed payment releases. It checks the asset&rsquo;s live status
            at the moment of release, every time, with no exceptions.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-10">
        <div>
          <span className="inline-block rounded-full bg-accent-bg text-accent text-xs font-semibold px-2.5 py-1">
            How it works
          </span>
          <h2 className="text-3xl font-bold tracking-tight mt-3">One asset, four moments</h2>
          <p className="text-text-secondary mt-2 max-w-xl text-sm leading-relaxed">
            This is the exact sequence a construction excavator goes through on BOTRAIL, from
            first registration to a payment the contract refuses on its own.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-2xl border border-border bg-surface p-6">
              <div className="text-2xl font-bold text-accent tabular">{step.n}</div>
              <h3 className="text-lg font-semibold mt-2">{step.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed mt-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="rounded-2xl border border-border bg-surface-elevated p-8 sm:p-10 flex flex-col gap-4 items-start">
        <h2 className="text-2xl font-bold tracking-tight">Ready to see it work?</h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-lg">
          Register an asset, upload evidence, and watch its passport update on real BOT Chain
          mainnet transactions, not a simulation.
        </p>
        <Link
          href="/assets/new"
          className="rounded-full bg-accent hover:bg-accent-hover px-5 py-2.5 text-sm font-semibold text-ink-on-accent transition-colors"
        >
          Register an asset
        </Link>
      </section>
    </div>
  );
}
