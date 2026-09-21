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

  retrievalRank: number | null;

  hitAt1: boolean | null;

  hitAt3: boolean | null;

  recallAt3: number | null;

  reciprocalRank: number | null;

  groundingValid: boolean;

  latencyMs: number;

  topSimilarity: number | null;

  error?: string;
};

async function evaluateCase(
  testCase: (typeof evalCases)[number],
): Promise<EvalResult> {
  const startedAt = performance.now();

  try {
    const result = await answerQuestion(testCase.question, testCase.trialId);

    const topSimilarity =
      result.chunks.length > 0 ? result.chunks[0]!.similarity : null;
    //grounding validation
    console.log({
      test: testCase.name,
      answer: result.answer.answer,
      evidence: result.answer.evidenceIds,
    });

    const latencyMs = performance.now() - startedAt;

    const expectedHeadings = testCase.expectedHeading;

    let retrievalRank: number | null = null;
    let hitAt1: boolean | null = null;
    let hitAt3: boolean | null = null;
    let recallAt3: number | null = null;
    let reciprocalRank: number | null = null;

    if (expectedHeadings && expectedHeadings.length > 0) {
      const firstRelevantIndex = result.chunks.findIndex((chunk) =>
        expectedHeadings.includes(chunk.heading),
      );

      retrievalRank = firstRelevantIndex === -1 ? null : firstRelevantIndex + 1;

      hitAt1 = retrievalRank !== null && retrievalRank <= 1;

      hitAt3 = retrievalRank !== null && retrievalRank <= 3;

      reciprocalRank = retrievalRank === null ? 0 : 1 / retrievalRank;

      const top3 = result.chunks.slice(0, 3);

      const retrievedRelevantHeadings = new Set(
        top3
          .filter((chunk) => expectedHeadings.includes(chunk.heading))
          .map((chunk) => chunk.heading),
      );

      recallAt3 = retrievedRelevantHeadings.size / expectedHeadings.length;
    }

    const grounding = validateGrounding(result.answer, result.evidence);

    return {
      name: testCase.name,

      expected: testCase.expectedAnswer,

      actual: result.answer.answer,

      answerCorrect: result.answer.answer === testCase.expectedAnswer,

      retrievalRank,
      hitAt1,
      hitAt3,
      recallAt3,
      reciprocalRank,
      topSimilarity,
      groundingValid: grounding.valid,

      latencyMs,
    };
  } catch (error) {
    return {
      name: testCase.name,

      expected: testCase.expectedAnswer,

      actual: "SYSTEM_ERROR",

      answerCorrect: false,

      retrievalRank: null,
      hitAt1: null,
      hitAt3: null,
      recallAt3: null,
      reciprocalRank: null,
      topSimilarity: null,
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

      rank:
        result.reciprocalRank === null ? "-" : (result.retrievalRank ?? "miss"),

      "hit@1": result.hitAt1 === null ? "-" : result.hitAt1 ? "✓" : "✗",

      "hit@3": result.hitAt3 === null ? "-" : result.hitAt3 ? "✓" : "✗",

      "recall@3": result.recallAt3 === null ? "-" : result.recallAt3.toFixed(2),

      cited: result.groundingValid ? "✓" : "✗",
      similarity:
        result.topSimilarity === null ? "-" : result.topSimilarity.toFixed(3),
      ms: Math.round(result.latencyMs),
    })),
  );

  // Overall Answer Accuracy
  const correctAnswers = results.filter(
    (result) => result.answerCorrect,
  ).length;

  const answerAccuracy = correctAnswers / results.length;

  //  Retrieval
  const retrievalCases = results.filter((result) => result.hitAt3 !== null);

  const hitAt1Rate =
    retrievalCases.length > 0
      ? retrievalCases.filter((result) => result.hitAt1).length /
        retrievalCases.length
      : 0;

  const hitAt3Rate =
    retrievalCases.length > 0
      ? retrievalCases.filter((result) => result.hitAt3).length /
        retrievalCases.length
      : 0;

  const meanRecallAt3 =
    retrievalCases.length > 0
      ? retrievalCases.reduce(
          (sum, result) => sum + (result.recallAt3 ?? 0),
          0,
        ) / retrievalCases.length
      : 0;

  const mrr =
    retrievalCases.length > 0
      ? retrievalCases.reduce(
          (sum, result) => sum + (result.reciprocalRank ?? 0),
          0,
        ) / retrievalCases.length
      : 0;

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

  console.log(`Hit@1: ${(hitAt1Rate * 100).toFixed(1)}%`);

  console.log(`Hit@3: ${(hitAt3Rate * 100).toFixed(1)}%`);

  console.log(`Recall@3: ${(meanRecallAt3 * 100).toFixed(1)}%`);

  console.log(`MRR: ${mrr.toFixed(3)}`);

  console.log(`Grounding pass rate: ${(groundingRate * 100).toFixed(1)}%`);

  console.log(`Abstention accuracy: ${(abstentionAccuracy * 100).toFixed(1)}%`);

  console.log(`Citation validity: ${(groundingRate * 100).toFixed(1)}%`);

  console.log(`Abstention recall: ${(abstentionAccuracy * 100).toFixed(1)}%`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.end();
  });
