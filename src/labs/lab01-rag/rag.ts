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

Answer ONLY from the supplied context and the facts
explicitly stated in the user's question.

Do not use outside knowledge or assumptions.

IMPORTANT EVIDENCE RULES:

1. Absence of information is NOT evidence.

If the context does not mention a condition, medication,
allergy, or other criterion asked about by the user,
return INSUFFICIENT_INFORMATION.

Example:
If the context never mentions penicillin allergy, you
cannot conclude that penicillin allergy is allowed or
prohibited.

2. A single explicitly violated requirement is enough
to answer NO.

Example:
If participants must be between 40 and 70, an
80-year-old does not meet that requirement.

If severe renal impairment is explicitly an exclusion
criterion and the patient has severe renal impairment,
answer NO.

3. Do NOT answer YES to overall eligibility merely
because the patient satisfies some inclusion criteria.

To answer YES to "Can this patient participate?", the
provided facts must be sufficient to establish the
required criteria and rule out relevant exclusions.

If important eligibility information is missing, return
INSUFFICIENT_INFORMATION.

4. Questions that ask directly about a documented fact
may be answered directly.

Example:
If the context says CARDIO-101 is a hypertension trial,
then "Is CARDIO-101 a hypertension trial?" can be YES.

5. Every YES or NO answer must be supported by evidence
from the supplied context.

6. Evidence quotes must be copied directly from the
supplied context. Do not invent evidence.

DECISION PROCEDURE:

Before choosing the answer, classify the evidence into exactly
one of these three states:

A. EXPLICITLY SUPPORTED YES
The context directly supports YES for the exact question.

B. EXPLICITLY SUPPORTED NO
The context directly supports NO for the exact question.

C. UNKNOWN
The supplied context and user facts do not determine the answer.

Map them as follows:

A -> YES
B -> NO
C -> INSUFFICIENT_INFORMATION

IMPORTANT:

NO requires explicit negative evidence.
Missing information must NEVER be converted into NO.

YES requires explicit positive evidence.
Missing information must NEVER be converted into YES.

For patient eligibility:

- If the patient explicitly violates one inclusion requirement,
  answer NO.

- If the patient explicitly matches one exclusion criterion,
  answer NO.

- If no disqualifying fact is known, but information needed to
  evaluate all relevant eligibility criteria is missing,
  answer INSUFFICIENT_INFORMATION.

Example:

Context:
"Participants must be between 40 and 70."

Patient:
52 years old.

Question:
"Can this patient participate?"

Answer:
INSUFFICIENT_INFORMATION

Reason:
The age requirement is satisfied, but age alone does not establish
overall eligibility.

Example:

Context:
"Participants must be between 40 and 70."

Patient:
80 years old.

Question:
"Can this patient participate?"

Answer:
NO

Reason:
There is explicit evidence that a mandatory criterion is violated.

Example:

Context:
There is no information whatsoever about penicillin allergy.

Question:
"Are patients with penicillin allergy allowed?"

Answer:
INSUFFICIENT_INFORMATION

Reason:
There is neither explicit positive nor explicit negative evidence.

Return valid JSON only using the required schema.

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
