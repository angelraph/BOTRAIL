import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./components/WalletProvider";
import { WalletConnectButton } from "./components/WalletConnectButton";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BOTRAIL: AI-Verified RWA Settlement",
  description: "Prove before you pay: AI-verified construction equipment, settled on BOT Chain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <WalletProvider>
          <header className="border-b border-border">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-lg font-bold tracking-tight">BOTRAIL</span>
                <span className="text-xs font-medium text-text-muted">on BOT Chain</span>
              </Link>
              <nav className="flex items-center gap-4 sm:gap-6 text-sm">
                <Link href="/assets" className="font-medium text-text-muted hover:text-text transition-colors">
                  Assets
                </Link>
                <Link
                  href="/assets/new"
                  className="rounded-full bg-accent hover:bg-accent-hover px-4 py-1.5 font-semibold text-ink-on-accent transition-colors whitespace-nowrap"
                >
                  Register Asset
                </Link>
                <WalletConnectButton />
              </nav>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-10">{children}</main>
          <footer className="border-t border-border py-6">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 text-xs text-text-muted">
              Evidence in, on-chain state and payment conditions out. The AI never moves funds.
              A smart contract does.
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
