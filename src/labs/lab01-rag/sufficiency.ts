import { z } from "zod";

import { llm, LLM_MODEL } from "../../shared/llm.js";

// import type { ContextChunk } from "./context.js";

import { buildContext } from "./context.js";

const SufficiencySchema = z.object({
  sufficient: z.boolean(),

  relevantSourceIds: z.array(z.string().regex(/^S\d+$/)),

  reason: z.string(),
});

export type SufficiencyResult = z.infer<typeof SufficiencySchema>;
