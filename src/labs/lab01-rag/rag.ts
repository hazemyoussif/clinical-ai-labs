import { llm, LLM_MODEL } from "../../shared/llm.js";

import { retrieve, type RetrievedChunk } from "./retrieval.js";

import { buildContext } from "./context.js";

import { RagAnswerSchema, type RagAnswer } from "./answer-schema.js";

export type RagResult = {
  answer: RagAnswer;
  chunks: RetrievedChunk[];
};

export async function answerQuestion(
  question: string,
  trialId?: string,
): Promise<RagResult> {
  const chunks = await retrieve(question, trialId, 4);

  if (chunks.length === 0) {
    return {
      answer: {
        answer: "INSUFFICIENT_INFORMATION",

        explanation: "No relevant information was retrieved.",

        evidence: [],
      },

      chunks,
    };
  }

  const context = buildContext(chunks);

  const response = await llm.responses.create({
    model: LLM_MODEL,

    instructions: `
You are a clinical-trial information assistant.

You must answer only from the supplied context
and facts explicitly provided by the user.

STRICT EVIDENCE RULES:

- Every YES or NO conclusion must be directly
  supported by the supplied evidence.

- Absence of information is NOT evidence.

- Never assume that something is allowed simply
  because it is not listed as prohibited.

- Never assume that something is prohibited simply
  because it is not listed as allowed.

- If a question asks about a criterion that is not
  explicitly addressed, answer
  INSUFFICIENT_INFORMATION.

- If determining eligibility requires patient facts
  that were not provided, answer
  INSUFFICIENT_INFORMATION.

- A single explicitly violated exclusion or inclusion
  criterion is enough to answer NO when appropriate.

- Evidence quotes must be copied exactly from the
  supplied context. Do not invent or paraphrase quotes.

Return JSON only:

{
  "answer": "YES" | "NO" | "INSUFFICIENT_INFORMATION",
  "explanation": "string",
  "evidence": [
    {
      "document": "string",
      "section": "string",
      "quote": "exact quote from context"
    }
  ]
}
      `.trim(),

    input: `
CONTEXT:

${context}

QUESTION:

${question}
      `.trim(),
  });

  const output = response.output_text?.trim();

  if (!output) {
    throw new Error("LLM returned no output");
  }

  const parsed = JSON.parse(output);

  const answer = RagAnswerSchema.parse(parsed);

  return {
    answer,
    chunks,
  };
}
