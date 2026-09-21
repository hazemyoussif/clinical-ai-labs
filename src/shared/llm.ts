import "dotenv/config";

import OpenAI from "openai";

const baseURL =
  process.env.LLM_BASE_URL ??
  "http://localhost:11434/v1";

const apiKey =
  process.env.LLM_API_KEY ??
  "ollama";

export const llm =
  new OpenAI({
    baseURL,
    apiKey,
  });

export const LLM_MODEL =
  process.env.LLM_MODEL ??
  "llama3.2:3b";