// Basic text chunking utility for splitting text into manageable pieces for embedding or processing.
// Using a simple paragraph-based approach, this utility splits text into chunks based on a maximum character limit, ensuring that each chunk is a coherent piece of text.

export type Chunk = {
  content: string;
  index: number;
};

export function chunkText(
  text: string,
  maxCharacters = 500,
): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];

  let buffer = "";

  for (const paragraph of paragraphs) {
    const candidate =
      buffer.length === 0
        ? paragraph
        : `${buffer}\n\n${paragraph}`;

    if (
      candidate.length <= maxCharacters
    ) {
      buffer = candidate;
      continue;
    }

    if (buffer.length > 0) {
      chunks.push({
        index: chunks.length,
        content: buffer,
      });
    }

    buffer = paragraph;
  }

  if (buffer.length > 0) {
    chunks.push({
      index: chunks.length,
      content: buffer,
    });
  }

  return chunks;
}