import { put } from "@vercel/blob";

/// Saves a raw evidence file to Vercel Blob (private store) under
/// evidence/{assetId}/. Vercel's serverless functions have no persistent
/// local filesystem — every request can land on a different instance — so
/// this can't be a local fs write the way it might be for a
/// single-process local server. Returns the blob's pathname, which is
/// what gets stored in the DB and later resolved back to bytes via
/// `@vercel/blob`'s `get()` in the evidence-serving route.
export async function saveEvidenceFile(assetId: number, fileName: string, buffer: Buffer): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `evidence/${assetId}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, buffer, {
    access: "private",
    addRandomSuffix: false,
  });

  return blob.pathname;
}
