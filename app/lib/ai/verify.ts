import OpenAI from "openai";
import type { AiVerdict, EvidenceCheck } from "../types";

// gpt-4o-mini is vision-capable and cheap enough for a hackathon demo's
// evidence volume; override with OPENAI_MODEL if you want a stronger model.
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Constructed lazily (not at module load) so a missing OPENAI_API_KEY only
// fails the specific verify call that needs it, rather than crashing
// `next build`'s static analysis of every route that imports this module.
let openai: OpenAI | undefined;
function getOpenAiClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in.");
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export interface EvidenceFile {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface VerifyEvidenceInput {
  assetName: string;
  assetType: string;
  /// Machine-readable condition names the model must evaluate, e.g.
  /// ["correct_asset", "delivery_confirmed", "inspection_passed"] or
  /// ["insurance_valid"]. Each becomes one entry in verdict.checks.
  requiredConditions: { name: string; description: string }[];
  files: EvidenceFile[];
}

// Raw shape requested from the model. `extractedFields` is a key/value
// array rather than an open-ended object because OpenAI's strict
// structured-output mode requires every object property to be declared
// up front — it can't validate an arbitrary dictionary.
const VERDICT_JSON_SCHEMA = {
  name: "evidence_verdict",
  strict: true,
  schema: {
    type: "object",
    properties: {
      checks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            passed: { type: "boolean" },
            detail: { type: "string", description: "One sentence: what evidence supports this verdict." },
          },
          required: ["name", "passed", "detail"],
          additionalProperties: false,
        },
      },
      confidence: { type: "number", description: "Overall confidence in this verdict, 0 to 1." },
      extractedFields: {
        type: "array",
        description: "Key facts pulled from the evidence, e.g. policy number, expiry date, operating hours.",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" },
          },
          required: ["key", "value"],
          additionalProperties: false,
        },
      },
      explanation: { type: "string", description: "Short human-readable summary of the overall verdict." },
      criticalIssue: {
        type: "boolean",
        description: "True if evidence reveals something that should restrict the asset right now (e.g. expired insurance, asset mismatch, forged-looking document).",
      },
    },
    required: ["checks", "confidence", "extractedFields", "explanation", "criticalIssue"],
    additionalProperties: false,
  },
} as const;

interface RawVerdict {
  checks: EvidenceCheck[];
  confidence: number;
  extractedFields: { key: string; value: string }[];
  explanation: string;
  criticalIssue: boolean;
}

function buildContentParts(input: VerifyEvidenceInput) {
  const conditionList = input.requiredConditions.map((c) => `- ${c.name}: ${c.description}`).join("\n");

  const textPart = {
    type: "text" as const,
    text: [
      `Asset: ${input.assetName} (${input.assetType}).`,
      `Evaluate the attached evidence against these required conditions:`,
      conditionList,
      ``,
      `For each required condition, add one entry to "checks" with that exact name, `,
      `whether it passed, and a one-sentence reason grounded in the evidence. `,
      `Set criticalIssue=true if anything in the evidence indicates the asset should be `,
      `restricted right now (expired insurance/permits, mismatched asset identifiers, `,
      `signs of a forged or altered document) even if it isn't one of the listed conditions.`,
    ].join("\n"),
  };

  const evidenceParts = input.files.map((f) => {
    if (f.mimeType.startsWith("image/")) {
      const base64 = f.buffer.toString("base64");
      return {
        type: "image_url" as const,
        image_url: { url: `data:${f.mimeType};base64,${base64}` },
      };
    }
    // Non-image evidence (plain text / OCR'd document content) is inlined
    // as text. PDF parsing is out of scope for this build — evidence
    // files should be images or .txt for the demo.
    return {
      type: "text" as const,
      text: `--- ${f.fileName} ---\n${f.buffer.toString("utf-8")}`,
    };
  });

  return [textPart, ...evidenceParts];
}

/// Calls OpenAI to produce a structured verdict from evidence files against
/// a set of required conditions. This function ONLY proposes structured
/// findings — it never decides whether a payment releases or an asset's
/// on-chain status changes. See `evaluateConditions` below for the
/// deterministic rule engine that makes that call.
export async function verifyEvidence(input: VerifyEvidenceInput): Promise<AiVerdict> {
  const response = await getOpenAiClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are BOTRAIL's evidence verification layer for construction equipment RWA assets. " +
          "You are careful, skeptical, and cite specific evidence for every claim. You never invent " +
          "facts not present in the evidence. You output only the structured verdict requested.",
      },
      {
        role: "user",
        content: buildContentParts(input),
      },
    ],
    response_format: { type: "json_schema", json_schema: VERDICT_JSON_SCHEMA },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned no content for evidence verdict");

  const parsed: RawVerdict = JSON.parse(raw);

  const extractedFields: Record<string, string> = {};
  for (const { key, value } of parsed.extractedFields) extractedFields[key] = value;

  return {
    checks: parsed.checks,
    confidence: parsed.confidence,
    extractedFields,
    explanation: parsed.explanation,
    criticalIssue: parsed.criticalIssue,
  };
}

/// Deterministic, non-LLM rule engine. This is what actually decides
/// conditionsMet from a verdict — the boundary the whole system's trust
/// model depends on (see contracts/src/SettlementEscrow.sol header
/// comment). Keep this simple and auditable; do not fold LLM judgment
/// calls into it beyond the structured booleans it's given. Asset status
/// transitions are a separate decision — see lib/status-transition.ts.
export function evaluateConditions(
  verdict: AiVerdict,
  requiredConditionNames: string[],
  opts?: { confidenceThreshold?: number }
): { conditionsMet: boolean } {
  const threshold = opts?.confidenceThreshold ?? 0.7;
  const passedNames = new Set(verdict.checks.filter((c) => c.passed).map((c) => c.name));
  const allRequiredPassed = requiredConditionNames.every((name) => passedNames.has(name));

  const conditionsMet = allRequiredPassed && verdict.confidence >= threshold && !verdict.criticalIssue;

  return { conditionsMet };
}
