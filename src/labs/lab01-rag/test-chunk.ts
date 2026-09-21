import fs from "node:fs/promises";

import {chunkText} from "./chunk-basic.js";

import {chunkMarkdown} from "./chunk.js";

const text = await fs.readFile("data/lab01/cardio-101.md", "utf-8");

const chunks = chunkText(text, 300);

const enhancedChunks = chunkMarkdown(text);

console.log(`Total chunks: ${chunks.length}`);

for (const chunk of chunks) {
  console.log(`Chunk ${chunk.index}:`);
  console.log(chunk.content);
  console.log("-----");
}

console.log(`Total enhanced chunks: ${enhancedChunks.length}`);

for (const chunk of enhancedChunks) {
  console.log(`Enhanced Chunk ${chunk.index}:`);
  console.log(chunk.content);
  console.log("-----");
}