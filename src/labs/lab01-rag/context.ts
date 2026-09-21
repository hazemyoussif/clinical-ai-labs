import type { RetrievedChunk } from "./retrieval.js";

export function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, index) =>
      `
[Source ${index + 1}]
Document: ${chunk.documentTitle}
Section: ${chunk.heading}
Similarity: ${chunk.similarity.toFixed(4)}

${chunk.content}
      `.trim(),
    )
    .join("\n\n====================\n\n");
}
