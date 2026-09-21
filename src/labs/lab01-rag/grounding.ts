import type { RagAnswer } from "./answer-schema.js";

import type { RetrievedChunk } from "./retrieval.js";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export type GroundingResult = {
  valid: boolean;
  reasons: string[];
};

export function validateGrounding(
  answer: RagAnswer,
  chunks: RetrievedChunk[],
): GroundingResult {
  const reasons: string[] = [];

  if (answer.answer === "INSUFFICIENT_INFORMATION") {
    return {
      valid: true,
      reasons,
    };
  }

  if (answer.evidence.length === 0) {
    return {
      valid: false,
      reasons: ["Conclusion has no supporting evidence."],
    };
  }

  for (const evidence of answer.evidence) {
    const source = chunks.find(
      (chunk) =>
        chunk.documentTitle === evidence.document &&
        chunk.heading === evidence.section,
    );

    if (!source) {
      reasons.push(
        `Source not retrieved: ${evidence.document} / ${evidence.section}`,
      );

      continue;
    }

    const quoteExists = normalize(source.content).includes(
      normalize(evidence.quote),
    );

    if (!quoteExists) {
      reasons.push(`Quote does not exist in source: "${evidence.quote}"`);
    }
  }

  return {
    valid: reasons.length === 0,

    reasons,
  };
}
