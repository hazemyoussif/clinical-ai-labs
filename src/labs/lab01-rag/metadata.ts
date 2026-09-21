export type DocumentMetadata = {
  trialId?: string;
  phase?: string;
  condition?: string;
};

export function extractDocumentMetadata(
  markdown: string,
): DocumentMetadata {
  const trialId =
    markdown.match(
      /Trial ID:\s*(.+)/i,
    )?.[1]?.trim() ?? "";

  const phase =
    markdown.match(
      /Phase:\s*(.+)/i,
    )?.[1]?.trim() ?? "";

  const condition =
    markdown.match(
      /Condition:\s*(.+)/i,
    )?.[1]?.trim() ?? "";

  return {
    trialId,
    phase,
    condition,
  };
}