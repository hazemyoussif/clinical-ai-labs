import 'dotenv/config';

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;

const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL as string;

export function toVector(values: number[]): string {
    return `[${values.join(",")}]`;
  }

export async function embed(text: string): Promise<number[]> {
  const response = await fetch(EMBEDDING_BASE_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Embedding request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    embeddings: number[][];
  };

  const embedding = data.embeddings[0];

  if (!embedding) {
    throw new Error("Embedding model returned no embedding");
  }

  return embedding;
}