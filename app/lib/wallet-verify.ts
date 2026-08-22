import { verifyMessage } from "ethers";

/// Verifies that `signature` over `message` was produced by `claimedAddress`'s
/// private key (EIP-191 personal_sign, what every browser wallet's
/// `personal_sign` / `eth_sign`-via-personal_sign flow produces). This is
/// what proves a connected wallet actually authorized an action — the
/// on-chain write itself still goes through the attester (see
/// lib/chain/contracts.ts), but only after this check passes.
export function verifySignedAddress(message: string, signature: string, claimedAddress: string): boolean {
  if (!message || !signature || !claimedAddress) return false;
  try {
    const recovered = verifyMessage(message, signature);
    return recovered.toLowerCase() === claimedAddress.toLowerCase();
  } catch {
    return false;
  }
}
