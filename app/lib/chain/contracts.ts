import { Contract, parseEther, formatEther, type ContractTransactionReceipt, type Log } from "ethers";
import { getAttester } from "./client";
import assetRegistryAbi from "./AssetRegistry.abi.json";
import settlementEscrowAbi from "./SettlementEscrow.abi.json";
import { ON_CHAIN_ASSET_STATUS } from "../types";

function requireAddress(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `${envVar} is not set. Deploy the contracts (see contracts/README or root README) and set it in .env.`
    );
  }
  return value;
}

// Constructed lazily so a missing ASSET_REGISTRY_ADDRESS / SETTLEMENT_ESCROW_ADDRESS
// (e.g. before contracts are deployed) only fails the specific call that
// needs it, rather than crashing `next build`'s static analysis of every
// route that imports this module.
let assetRegistrySingleton: Contract | undefined;
function getAssetRegistry(): Contract {
  if (!assetRegistrySingleton) {
    assetRegistrySingleton = new Contract(requireAddress("ASSET_REGISTRY_ADDRESS"), assetRegistryAbi, getAttester());
  }
  return assetRegistrySingleton;
}

let settlementEscrowSingleton: Contract | undefined;
function getSettlementEscrow(): Contract {
  if (!settlementEscrowSingleton) {
    settlementEscrowSingleton = new Contract(
      requireAddress("SETTLEMENT_ESCROW_ADDRESS"),
      settlementEscrowAbi,
      getAttester()
    );
  }
  return settlementEscrowSingleton;
}

/// Maps our app-level "ACTIVE" | "RESTRICTED" onto the on-chain enum
/// index. Must stay in sync with contracts/src/AssetRegistry.sol's
/// `Status` enum ordering (ACTIVE = 0, RESTRICTED = 1).
function onChainStatusIndex(status: "ACTIVE" | "RESTRICTED"): number {
  return ON_CHAIN_ASSET_STATUS.indexOf(status);
}

function findEventArgs(
  contract: Contract,
  receipt: ContractTransactionReceipt,
  eventName: string
): Record<string, unknown> | undefined {
  for (const log of receipt.logs as Log[]) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === eventName) {
        return parsed.args.toObject ? parsed.args.toObject() : (parsed.args as unknown as Record<string, unknown>);
      }
    } catch {
      // log belongs to a different contract/interface; ignore
    }
  }
  return undefined;
}

export async function registerAssetOnChain(ownerAddress: string, metadataURI: string) {
  const assetRegistry = getAssetRegistry();
  const tx = await assetRegistry.registerAsset(ownerAddress, metadataURI);
  const receipt: ContractTransactionReceipt = await tx.wait();
  const args = findEventArgs(assetRegistry, receipt, "AssetRegistered");
  const assetId = args ? Number(args.assetId) : undefined;
  return { assetId, txHash: receipt.hash };
}

export async function recordEvidenceOnChain(
  chainAssetId: number,
  evidenceHash: `0x${string}`,
  verdict: string,
  newStatus: "ACTIVE" | "RESTRICTED"
) {
  const tx = await getAssetRegistry().recordEvidence(
    chainAssetId,
    evidenceHash,
    verdict,
    onChainStatusIndex(newStatus)
  );
  const receipt: ContractTransactionReceipt = await tx.wait();
  return { txHash: receipt.hash };
}

export async function getAssetStatusOnChain(chainAssetId: number): Promise<"ACTIVE" | "RESTRICTED"> {
  const statusIndex: bigint = await getAssetRegistry().getStatus(chainAssetId);
  return ON_CHAIN_ASSET_STATUS[Number(statusIndex)] as "ACTIVE" | "RESTRICTED";
}

export async function createAgreementOnChain(
  chainAssetId: number,
  payerAddress: string,
  payeeAddress: string,
  amountBot: string,
  conditionsHash: `0x${string}`
) {
  const settlementEscrow = getSettlementEscrow();
  const tx = await settlementEscrow.createAgreement(chainAssetId, payerAddress, payeeAddress, conditionsHash, {
    value: parseEther(amountBot),
  });
  const receipt: ContractTransactionReceipt = await tx.wait();
  const args = findEventArgs(settlementEscrow, receipt, "AgreementCreated");
  const agreementId = args ? Number(args.agreementId) : undefined;
  return { agreementId, txHash: receipt.hash };
}

export async function attemptReleaseOnChain(
  chainAgreementId: number,
  evidenceHash: `0x${string}`,
  conditionsMet: boolean
) {
  const settlementEscrow = getSettlementEscrow();
  const tx = await settlementEscrow.attemptRelease(chainAgreementId, evidenceHash, conditionsMet);
  const receipt: ContractTransactionReceipt = await tx.wait();
  const args = findEventArgs(settlementEscrow, receipt, "ReleaseAttempted");
  const released = args ? Boolean(args.released) : false;
  return { released, txHash: receipt.hash };
}

export async function refundAgreementOnChain(chainAgreementId: number) {
  const tx = await getSettlementEscrow().refund(chainAgreementId);
  const receipt: ContractTransactionReceipt = await tx.wait();
  return { txHash: receipt.hash };
}

export { formatEther };
