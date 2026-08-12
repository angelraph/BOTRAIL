import { JsonRpcProvider, NonceManager, Wallet } from "ethers";

/// Single shared provider + attester signer for the whole app. The
/// attester wallet is the only account that can call the privileged
/// functions on AssetRegistry / SettlementEscrow (see contracts/src) — it
/// represents the BOTRAIL backend service, not any individual user.
/// Works unchanged against local Anvil (RPC_URL=http://127.0.0.1:8545) or
/// BOT Chain mainnet (chain ID 677) once real RPC_URL/key are supplied.
///
/// Wrapped in a NonceManager: BOTRAIL can fire several attester-signed
/// transactions in quick succession (register -> fund agreement -> attempt
/// release), and querying the node for "pending" nonce fresh on every send
/// races with same-block instant-mine chains like Anvil. NonceManager
/// tracks the nonce in-process after the first fetch instead.

declare global {
  // eslint-disable-next-line no-var
  var __botrailProvider: JsonRpcProvider | undefined;
  // eslint-disable-next-line no-var
  var __botrailAttester: NonceManager | undefined;
}

function buildProvider() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  return new JsonRpcProvider(rpcUrl);
}

export const provider = globalThis.__botrailProvider ?? buildProvider();

function buildAttester() {
  const key = process.env.ATTESTER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "ATTESTER_PRIVATE_KEY is not set. Copy .env.example to .env and fill it in " +
        "(for local dev, use one of Anvil's printed default account keys)."
    );
  }
  return new NonceManager(new Wallet(key, provider));
}

export const attester = globalThis.__botrailAttester ?? buildAttester();

if (process.env.NODE_ENV !== "production") {
  globalThis.__botrailProvider = provider;
  globalThis.__botrailAttester = attester;
}
