"use client";

import { useWallet } from "./WalletProvider";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletConnectButton() {
  const { address, connecting, error, connect, disconnect } = useWallet();

  if (address) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-border bg-surface pl-3 pr-1.5 py-1.5 text-xs font-mono text-text">
        <span className="h-1.5 w-1.5 rounded-full bg-verified" />
        {short(address)}
        <button
          type="button"
          onClick={disconnect}
          title="Disconnect wallet"
          className="rounded-full px-2 py-0.5 text-[10px] font-sans font-semibold text-text-muted hover:text-text hover:bg-surface-elevated transition-colors"
        >
          Disconnect
        </button>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={connect}
        disabled={connecting}
        className="rounded-full border border-border hover:border-accent px-3.5 py-1.5 text-xs font-semibold text-text transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && <span className="text-[10px] text-text-muted max-w-[16rem] text-right">{error}</span>}
    </div>
  );
}
