// Thin wrapper around the browser's injected EIP-1193 wallet (MetaMask etc).
// Deliberately avoids pulling in a wallet-connect library — BOT Chain isn't
// in most wallets' default chain lists yet, so we also offer to add it.

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const BOT_CHAIN_PARAMS = {
  chainId: "0x2a5", // 677
  chainName: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: ["https://rpc.botchain.ai"],
  blockExplorerUrls: ["https://scan.botchain.ai"],
};

function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Install MetaMask or another browser wallet extension.");
  }
  return window.ethereum;
}

export async function connectWallet(): Promise<string> {
  const eth = getProvider();
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("No account returned by wallet.");
  try {
    await eth.request({ method: "wallet_addEthereumChain", params: [BOT_CHAIN_PARAMS] });
  } catch {
    // user rejected adding the chain, or wallet already has it — not fatal,
    // signing still works without switching networks.
  }
  return accounts[0];
}

export async function signWalletMessage(address: string, message: string): Promise<string> {
  const eth = getProvider();
  return (await eth.request({ method: "personal_sign", params: [message, address] })) as string;
}
