import type { ResponseInputItem } from "openai/resources/responses/responses.js";

import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { llm, LLM_MODEL } from "../../shared/llm.js";

import { executeTool, toolDefinitions } from "./tools.js";
import type { OpenAI } from "openai";

const MAX_STEPS = 5;

export async function runAgent(userMessage: string) {
  const input: ResponseInputItem[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await llm.responses.create({
      model: LLM_MODEL,

      temperature: 0,

      instructions: `
You are a clinical-trial operations assistant.

Use tools when factual operational data is required.

Never invent trial data, site availability,
or appointment status.

You may create appointment drafts,
but you must never claim that a draft
is a confirmed booking.

A draft with status PENDING_HUMAN_APPROVAL
requires human approval before any real action.

If a tool fails, explain the failure rather
than inventing a result.
        `.trim(),

      tools: toolDefinitions,

      input,
    });

    input.push(...toResponseInputItems(response.output));

    const toolCalls = response.output.filter(
      (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
        item.type === "function_call",
    );

    if (toolCalls.length === 0) {
      return response.output_text;
    }

    for (const call of toolCalls) {
      console.log(`Tool call: ${call.name}`, call.arguments);

      const result = await executeTool(call.name, call.arguments);

      console.log("Tool result:", result);

      input.push({
        type: "function_call_output",

        call_id: call.call_id,

        output: JSON.stringify(result),
      });
    }
  }

  throw new Error(`Agent exceeded ${MAX_STEPS} steps`);
}
