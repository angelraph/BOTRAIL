import { mkdir, writeFile } from "fs/promises";
import path from "path";

const EVIDENCE_ROOT = path.join(process.cwd(), "data", "evidence");

/// Saves a raw evidence file to local disk under data/evidence/{assetId}/.
/// This is the demo-scale stand-in for the "evidence storage" layer — an
/// IPFS/S3 swap is a later concern, not a day-1 dependency (see plan).
/// Returns the path stored in the DB (relative to the app root).
export async function saveEvidenceFile(assetId: number, fileName: string, buffer: Buffer): Promise<string> {
  const dir = path.join(EVIDENCE_ROOT, String(assetId));
  await mkdir(dir, { recursive: true });
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const fullPath = path.join(dir, safeName);
  await writeFile(fullPath, buffer);
  return path.relative(process.cwd(), fullPath);
}
