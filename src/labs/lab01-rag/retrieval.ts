import { db } from "../../shared/db.js";

import { embed, toVector } from "../../shared/embeddings.js";

export type RetrievedChunk = {
  documentTitle: string;
  heading: string;
  content: string;
  similarity: number;
};

export async function retrieve(
  query: string,
  trialId?: string,
  limit = 3,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embed(query);

  const result = await db.query(
    `
    SELECT
      d.title AS "documentTitle",

      dc.metadata->>'heading'
        AS heading,

      dc.content,

      1 - (
        dc.embedding
        <=>
        $1::vector
      ) AS similarity

    FROM document_chunks dc

    JOIN documents d
      ON d.id = dc.document_id

    WHERE
      (
        $2::text IS NULL
        OR
        d.metadata->>'trialId' = $2
      )

    ORDER BY
      dc.embedding
      <=>
      $1::vector

    LIMIT $3
    `,
    [toVector(queryEmbedding), trialId ?? null, limit],
  );

  return result.rows.map((row) => ({
    ...row,
    similarity: Number(row.similarity),
  }));
}
