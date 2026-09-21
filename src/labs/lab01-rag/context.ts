import type { RetrievedChunk } from "./retrieval.js";

export type Evidence = RetrievedChunk & {
  id: string;
};

export function prepareEvidence(chunks: RetrievedChunk[]): Evidence[] {
  return chunks.map((chunk, index) => ({
    ...chunk,
    id: `E${index + 1}`,
  }));
}

export function buildContext(evidence: Evidence[]): string {
  return evidence
    .map((item) =>
      `
[${item.id}]
Document: ${item.documentTitle}
Section: ${item.heading}
Similarity: ${item.similarity.toFixed(4)}

${item.content}
        `.trim(),
    )
    .join("\n\n====================\n\n");
}
