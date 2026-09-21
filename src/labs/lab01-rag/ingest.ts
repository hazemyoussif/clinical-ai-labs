import * as dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

import fs from 'node:fs/promises';
import path from 'node:path';

import {db} from '../../shared/db.js';

import {embed, toVector} from '../../shared/embeddings.js';

import {chunkMarkdown} from './chunk.js';

import {extractDocumentMetadata} from './metadata.js';

expand(dotenv.config());

const DATA_DIR = "data/lab01";

async function getMarkdownFiles():Promise<string[]> {
  const files = await fs.readdir(DATA_DIR);
  return files.filter(file => file.endsWith('.md'));
}

async function upsertDocument( externalID: string, title:string,spurce:string, metadata: Record<string,unknown>):Promise<number>{
    const result = await db.query(`
        INSERT INTO documents (external_id, title, source, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT (external_id) DO UPDATE SET
            title = EXCLUDED.title,
            source = EXCLUDED.source,
            metadata = EXCLUDED.metadata
        RETURNING id;
    `, [externalID, title, spurce, JSON.stringify(metadata)]);
    return result.rows[0].id;
}

async function deleteDocumentChunks(documentId: number):Promise<void>{
    await db.query(`
        DELETE FROM document_chunks WHERE document_id = $1;
    `, [documentId]);
}

async function insertChunk(
  documentId: number,
  chunkIndex: number,
  content: string,
  metadata: Record<string, unknown>,
  embedding: number[],
): Promise<void> {
  await db.query(
    `
    INSERT INTO document_chunks (
      document_id,
      chunk_index,
      content,
      metadata,
      embedding
    )

    VALUES (
      $1,
      $2,
      $3,
      $4::jsonb,
      $5::vector
    )
    `,
    [
      documentId,
      chunkIndex,
      content,
      JSON.stringify(metadata),
      toVector(embedding),
    ],
  );
}

async function ingestDocument(
  filePath: string,
): Promise<void> {
  const markdown = await fs.readFile(filePath,"utf8");
  const filename = path.basename(filePath);

  const chunks = chunkMarkdown(markdown);

  if (chunks.length === 0) {
    console.warn(`No chunks found: ${filename}`);

    return;
  }

  const documentMetadata = extractDocumentMetadata(markdown);

  const title = chunks[0]?.title ?? filename;

  console.log(`\nIngesting ${filename}`);

  console.log(`Title: ${title}`);

  console.log(`Chunks: ${chunks.length}`);

  const documentId =
    await upsertDocument(
      filename,
      title,
      filename,
      documentMetadata,
    );

  await deleteDocumentChunks(
    documentId,
  );

  for (const chunk of chunks) {
    console.log(
      `Embedding chunk ${chunk.index}: ${chunk.heading}`,
    );

    const embedding =
      await embed(chunk.content);

    const chunkMetadata = {
      ...documentMetadata,

      heading:
        chunk.heading,
    };

    await insertChunk(
      documentId,
      chunk.index,
      chunk.content,
      chunkMetadata,
      embedding,
    );
  }

  console.log(
    `Finished ${filename}`,
  );
}

async function main(): Promise<void> {
  const files = await getMarkdownFiles();

  console.log( `Found ${files.length} Markdown files`);

  for (const file of files) {
    await ingestDocument(`${DATA_DIR}/${file}`);
  }

  await db.end();

  console.log(
    "\nIngestion complete",
  );
}

main().catch(
  async (error) => {
    console.error(
      "Ingestion failed:",
      error,
    );

    await db.end();

    process.exit(1);
  },
);