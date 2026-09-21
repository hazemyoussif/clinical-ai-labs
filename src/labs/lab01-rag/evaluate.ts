import { performance } from "node:perf_hooks";

import { db } from "../../shared/db.js";

import { answerQuestion } from "./rag.js";

import { validateGrounding } from "./grounding.js";

import { evalCases } from "./eval-set.js";

type EvalResult = {
  name: string;

  expected: string;

  actual: string;

  answerCorrect: boolean;

  retrievalHit: boolean | null;

  groundingValid: boolean;

  latencyMs: number;

  error?: string;
};

async function evaluateCase(
  testCase: (typeof evalCases)[number],
): Promise<EvalResult> {
  const startedAt = performance.now();

  try {
    const result = await answerQuestion(testCase.question, testCase.trialId);
    //grounding validation
    console.log({
      test: testCase.name,
      answer: result.answer.answer,
      evidence: result.answer.evidenceIds,
    });

    const latencyMs = performance.now() - startedAt;

    const retrievalHit = testCase.expectedHeading
      ? result.chunks.some(
          (chunk) => chunk.heading === testCase.expectedHeading,
        )
      : null;

    const grounding = validateGrounding(result.answer, result.evidence);

    return {
      name: testCase.name,

      expected: testCase.expectedAnswer,

      actual: result.answer.answer,

      answerCorrect: result.answer.answer === testCase.expectedAnswer,

      retrievalHit,

      groundingValid: grounding.valid,

      latencyMs,
    };
  } catch (error) {
    return {
      name: testCase.name,

      expected: testCase.expectedAnswer,

      actual: "SYSTEM_ERROR",

      answerCorrect: false,

      retrievalHit: null,

      groundingValid: false,

      latencyMs: performance.now() - startedAt,

      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const results: EvalResult[] = [];

  for (const testCase of evalCases) {
    console.log(`Testing: ${testCase.name}`);

    const result = await evaluateCase(testCase);

    results.push(result);
  }

  console.table(
    results.map((result) => ({
      test: result.name,

      expected: result.expected,

      actual: result.actual,

      answer: result.answerCorrect ? "✓" : "✗",

      retrieval:
        result.retrievalHit === null ? "-" : result.retrievalHit ? "✓" : "✗",

      grounded: result.groundingValid ? "✓" : "✗",

      ms: Math.round(result.latencyMs),
    })),
  );

  // Overall Answer Accuracy
  const correctAnswers = results.filter(
    (result) => result.answerCorrect,
  ).length;

  const answerAccuracy = correctAnswers / results.length;

  //  Retrieval
  const retrievalCases = results.filter(
    (result) => result.retrievalHit !== null,
  );

  const retrievalHits = retrievalCases.filter(
    (result) => result.retrievalHit,
  ).length;

  const retrievalHitRate =
    retrievalCases.length > 0 ? retrievalHits / retrievalCases.length : 0;

  // Grounding
  const groundingPasses = results.filter(
    (result) => result.groundingValid,
  ).length;

  const groundingRate = groundingPasses / results.length;

  //Abstention accuracy
  const abstentionCases = results.filter(
    (_, index) =>
      evalCases[index]?.expectedAnswer === "INSUFFICIENT_INFORMATION",
  );

  const correctAbstentions = abstentionCases.filter(
    (result) => result.actual === "INSUFFICIENT_INFORMATION",
  ).length;

  const abstentionAccuracy =
    abstentionCases.length > 0
      ? correctAbstentions / abstentionCases.length
      : 0;

  // Print summary
  console.log("\nEvaluation Results");

  console.log(`Answer accuracy: ${(answerAccuracy * 100).toFixed(1)}%`);

  console.log(`Retrieval hit rate: ${(retrievalHitRate * 100).toFixed(1)}%`);

  console.log(`Grounding pass rate: ${(groundingRate * 100).toFixed(1)}%`);

  console.log(`Abstention accuracy: ${(abstentionAccuracy * 100).toFixed(1)}%`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.end();
  });
