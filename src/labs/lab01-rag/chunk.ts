export type Chunk = {
  index: number;
  title: string;
  heading: string;
  content: string;
};

export function chunkMarkdown(
  markdown: string,
): Chunk[] {
  const lines = markdown.split("\n");

  let title = "";
  let currentHeading = "";
  let currentContent: string[] = [];

  const chunks: Chunk[] = [];

  const pushChunk = () => {
    if (!currentHeading) {
      return;
    }

    const body = currentContent
      .join("\n")
      .trim();

    if (!body) {
      return;
    }

    chunks.push({
      index: chunks.length,
      title,
      heading: currentHeading.replace(/^##\s+/, ""),
      content: [
        title,
        currentHeading,
        body,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line
        .replace(/^#\s+/, "")
        .trim();

      continue;
    }

    if (line.startsWith("## ")) {
      pushChunk();

      currentHeading = line.trim();
      currentContent = [];

      continue;
    }

    currentContent.push(line);
  }

  pushChunk();

  return chunks;
}