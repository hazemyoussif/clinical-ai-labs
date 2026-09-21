import type { RagAnswer } from "./answer-schema.js";

import type { Evidence } from "./context.js";

export type GroundingResult = {
  valid: boolean;
  reasons: string[];
};

export function validateGrounding(
  answer: RagAnswer,
  evidence: Evidence[],
): GroundingResult {
  const reasons: string[] = [];

  if (answer.answer === "INSUFFICIENT_INFORMATION") {
    return {
      valid: true,
      reasons,
    };
  }

  if (answer.evidenceIds.length === 0) {
    return {
      valid: false,
      reasons: ["Conclusion has no supporting evidence."],
    };
  }

  const availableIds = new Set(evidence.map((item) => item.id));

  for (const evidenceId of answer.evidenceIds) {
    if (!availableIds.has(evidenceId)) {
      reasons.push(`Evidence ID was not supplied to the model: ${evidenceId}`);
    }
  }

  return {
    valid: reasons.length === 0,

    reasons,
  };
}
