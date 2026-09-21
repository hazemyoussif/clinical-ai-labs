import { z } from "zod";

export const EvidenceSchema = z.object({
  document: z.string().min(1),
  section: z.string().min(1),
  quote: z.string().min(1),
});

export const RagAnswerSchema = z.object({
  answer: z.enum(["YES", "NO", "INSUFFICIENT_INFORMATION"]),

  explanation: z.string().min(1),

  evidence: z.array(EvidenceSchema),
});

export type RagAnswer = z.infer<typeof RagAnswerSchema>;
