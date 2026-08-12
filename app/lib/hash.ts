import { createHash } from "crypto";
import { keccak256, toUtf8Bytes } from "ethers";

/// sha256 of raw evidence bytes, returned as a 0x-prefixed bytes32 hex
/// string — this is what gets anchored on-chain via
/// AssetRegistry.recordEvidence / SettlementEscrow.attemptRelease.
export function sha256Hex(data: Buffer): `0x${string}` {
  return `0x${createHash("sha256").update(data).digest("hex")}`;
}

/// keccak256 of a human-readable string (e.g. a rental agreement's
/// condition list) — used for SettlementEscrow's conditionsHash field.
export function keccakOfString(text: string): `0x${string}` {
  return keccak256(toUtf8Bytes(text)) as `0x${string}`;
}
