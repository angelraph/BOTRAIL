/// Builds a block-explorer link for a tx hash when running against BOT
/// Chain mainnet (chain ID 677); returns null for local Anvil (chain ID
/// 31337) since there's no explorer for it — callers should fall back to
/// showing the raw hash.
export function txExplorerUrl(txHash: string): string | null {
  const chainId = process.env.CHAIN_ID;
  if (chainId === "677") return `https://scan.botchain.ai/tx/${txHash}`;
  return null;
}
