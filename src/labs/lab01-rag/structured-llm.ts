import { z } from "zod";

import { llm, LLM_MODEL } from "../../shared/llm.js";
export async function generateStructured<T>(
  stage: string,
  instructions: string,
  input: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const maxAttempts = 2;

  let previousError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await llm.chat.completions.create({
      model: LLM_MODEL,

      temperature: 0,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",

          content: `
${instructions}

You MUST return a JSON object only.

Do not return Markdown.
Do not return code fences.
Do not omit required properties.

${previousError}
            `.trim(),
        },

        {
          role: "user",
          content: input,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();

    if (!raw) {
      previousError = "Previous attempt returned an empty response.";

      continue;
    }

    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch (error) {
      previousError = `
Your previous response was invalid JSON.

Parsing error:
${error instanceof Error ? error.message : String(error)}

Return corrected JSON only.
      `.trim();

      if (attempt === maxAttempts) {
        throw new Error(
          `[${stage}] Invalid JSON after ${maxAttempts} attempts.\n` +
            `Raw output: ${raw.slice(0, 500)}`,
        );
      }

      continue;
    }

    const validated = schema.safeParse(json);

    if (validated.success) {
      return validated.data;
    }

    previousError = `
Your previous JSON did not match the required schema.

Validation errors:
${JSON.stringify(validated.error.issues)}

Return the corrected object with every required property.
    `.trim();

    if (attempt === maxAttempts) {
      throw new Error(
        `[${stage}] Schema validation failed after ${maxAttempts} attempts.\n` +
          `${JSON.stringify(validated.error.issues)}\n` +
          `Raw output: ${raw.slice(0, 500)}`,
      );
    }
  }

  throw new Error(`[${stage}] Structured generation failed`);
}
