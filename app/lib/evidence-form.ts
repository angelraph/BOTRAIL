import { EVIDENCE_KIND, type EvidenceKind } from "./types";

export interface ParsedEvidenceFile {
  kind: EvidenceKind;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

/// Reads a multipart FormData submission where each evidence file is
/// appended under a field name equal to its EvidenceKind, e.g.
/// formData.append("INSURANCE", file). Supports multiple files of
/// different kinds in one request without needing index-matched arrays.
export async function parseEvidenceFormData(formData: FormData): Promise<ParsedEvidenceFile[]> {
  const files: ParsedEvidenceFile[] = [];

  for (const [key, value] of formData.entries()) {
    if (!(value instanceof Blob)) continue;
    if (!EVIDENCE_KIND.includes(key as EvidenceKind)) continue;

    const arrayBuffer = await value.arrayBuffer();
    files.push({
      kind: key as EvidenceKind,
      fileName: value instanceof File ? value.name : key,
      mimeType: value.type || "application/octet-stream",
      buffer: Buffer.from(arrayBuffer),
    });
  }

  return files;
}
