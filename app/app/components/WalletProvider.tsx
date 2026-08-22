"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { connectWallet, signWalletMessage } from "@/lib/wallet-client";

interface WalletState {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  sign: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
      return addr;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const sign = useCallback(
    async (message: string) => {
      if (!address) throw new Error("connect a wallet first");
      return signWalletMessage(address, message);
    },
    [address]
  );

  return (
    <WalletContext.Provider value={{ address, connecting, error, connect, sign }}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
