import { randomUUID } from "node:crypto";

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);

    this.name = "TimeoutError";
  }
}

export class TransientError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "TransientError";
  }
}

export function createTraceId(): string {
  return randomUUID();
}

export async function sleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation(),

      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new TimeoutError(timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export type RetryOptions = {
  attempts: number;

  baseDelayMs: number;

  shouldRetry?: (error: unknown) => boolean;

  onRetry?: (input: {
    attempt: number;
    delayMs: number;
    error: unknown;
  }) => void;
};

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  if (options.attempts < 1) {
    throw new Error("Retry attempts must be at least 1.");
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const shouldRetry = options.shouldRetry?.(error) ?? false;

      const hasMoreAttempts = attempt < options.attempts;

      if (!shouldRetry || !hasMoreAttempts) {
        throw error;
      }

      const delayMs = options.baseDelayMs * 2 ** (attempt - 1);

      options.onRetry?.({
        attempt,
        delayMs,
        error,
      });

      await sleep(delayMs);
    }
  }

  throw lastError;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof TimeoutError || error instanceof TransientError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("429") ||
    error.message.includes("502") ||
    error.message.includes("503") ||
    error.message.includes("504")
  );
}

export class IdempotencyStore<T> {
  private readonly values = new Map<string, T>();

  get(idempotencyKey: string): T | undefined {
    return this.values.get(idempotencyKey);
  }

  set(idempotencyKey: string, value: T): void {
    this.values.set(idempotencyKey, value);
  }

  getOrCreate(
    idempotencyKey: string,
    create: () => T,
  ): {
    value: T;
    created: boolean;
  } {
    const existing = this.values.get(idempotencyKey);

    if (existing !== undefined) {
      return {
        value: existing,
        created: false,
      };
    }

    const value = create();

    this.values.set(idempotencyKey, value);

    return {
      value,
      created: true,
    };
  }
}
