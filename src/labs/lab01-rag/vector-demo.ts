import * as dotenv from "dotenv";
import {expand} from 'dotenv-expand'
import { Client } from "pg";

expand(dotenv.config());

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;

const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL as string;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const client = new Client({
  connectionString: databaseUrl,
});

function toVector(values: number[]): string {
    return `[${values.join(",")}]`;
  }

async function embed(text: string): Promise<number[]> {
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

const sentences = [
    {
      label: "A",
      content: "The patient has severe renal impairment.",
    },
    {
      label: "B",
      content: "The patient suffers from serious kidney dysfunction.",
    },
    {
      label: "C",
      content: "The clinical site is located in Cairo.",
    },
  ];

  async function seed(): Promise<void> {
    for (const sentence of sentences) {
      const embedding = await embed(sentence.content);
  
      await client.query(
        `
        INSERT INTO vector_demo (
          label,
          content,
          embedding
        )
        VALUES ($1, $2, $3::vector)
  
        ON CONFLICT (label)
        DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding
        `,
        [
          sentence.label,
          sentence.content,
          toVector(embedding),
        ],
      );
  
      console.log(`Inserted ${sentence.label}`);
    }
  }

  async function search(query: string): Promise<void> {
    const queryEmbedding = await embed(query);
  
    const result = await client.query(
      `
      SELECT
        label,
        content,
        1 - (embedding <=> $1::vector) AS similarity
  
      FROM vector_demo
  
      ORDER BY embedding <=> $1::vector
  
      LIMIT 3
      `,
      [toVector(queryEmbedding)],
    );
  
    console.table(result.rows);
  }

  async function main(): Promise<void> {
    await client.connect();
  
    try {
      await seed();
  
      console.log("\nSearching...\n");
  
      await search(
        "The patient has severe renal impairment.",
      );
    } finally {
      await client.end();
    }
  }
  
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });

  