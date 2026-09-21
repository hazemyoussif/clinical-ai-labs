import { z } from "zod";

export const RagAnswerSchema = z.object({
  answer: z.enum(["YES", "NO", "INSUFFICIENT_INFORMATION"]),

  explanation: z.string().min(1),

  evidenceIds: z.array(z.string().regex(/^E\d+$/)),
});

export type RagAnswer = z.infer<typeof RagAnswerSchema>;
