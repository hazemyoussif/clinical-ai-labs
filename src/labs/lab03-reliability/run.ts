import { randomUUID } from "node:crypto";

import {
  createTraceId,
  IdempotencyStore,
  isRetryableError,
  logger,
  retry,
  TransientError,
  withTimeout,
} from "./reliability.js";

type AvailabilityResult = {
  site: string;
  date: string;
  available: boolean;
};

type AppointmentDraft = {
  id: string;

  patientId: string;

  trialId: string;

  site: string;

  date: string;

  status: "PENDING_HUMAN_APPROVAL";
};

const drafts = new IdempotencyStore<AppointmentDraft>();

let availabilityAttempts = 0;

async function checkSiteAvailability(
  site: string,
  date: string,
): Promise<AvailabilityResult> {
  availabilityAttempts++;

  /*
   * Simulate a temporary downstream
   * service failure.
   */
  if (availabilityAttempts < 3) {
    throw new TransientError(
      "503 availability service temporarily unavailable",
    );
  }

  return {
    site,
    date,

    available: site === "Cairo Medical Center" && date === "2026-09-23",
  };
}

function createAppointmentDraft(input: {
  patientId: string;

  trialId: string;

  site: string;

  date: string;
}): {
  draft: AppointmentDraft;

  created: boolean;
} {
  /*
   * In production this key should normally
   * come from the request/workflow and be
   * persisted in the database.
   */
  const idempotencyKey = [
    "appointment-draft",
    input.patientId,
    input.trialId,
    input.site,
    input.date,
  ].join(":");

  const result = drafts.getOrCreate(idempotencyKey, () => ({
    id: randomUUID(),

    ...input,

    status: "PENDING_HUMAN_APPROVAL",
  }));

  return {
    draft: result.value,

    created: result.created,
  };
}

async function main() {
  const traceId = createTraceId();

  logger.info({
    traceId,
    event: "workflow_started",
  });

  const site = "Cairo Medical Center";

  const date = "2026-09-23";

  const availabilityStartedAt = performance.now();

  const availability = await retry(
    () =>
      withTimeout(
        () => checkSiteAvailability(site, date),

        2_000,
      ),

    {
      attempts: 3,

      baseDelayMs: 250,

      shouldRetry: isRetryableError,

      onRetry: ({ attempt, delayMs, error }) => {
        logger.warn({
          traceId,

          event: "operation_retry",

          operation: "check_site_availability",

          attempt,

          delayMs,

          error: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  logger.info({
    traceId,

    event: "availability_checked",

    durationMs: Math.round(performance.now() - availabilityStartedAt),

    site: availability.site,

    date: availability.date,

    available: availability.available,
  });

  if (!availability.available) {
    logger.info({
      traceId,

      event: "workflow_completed",

      outcome: "SITE_UNAVAILABLE",
    });

    return;
  }

  /*
   * We deliberately do not log sensitive
   * patient details here.
   */
  const first = createAppointmentDraft({
    patientId: "P-100",

    trialId: "CARDIO-101",

    site,

    date,
  });

  logger.info({
    traceId,

    event: "appointment_draft_created",

    draftId: first.draft.id,

    created: first.created,

    status: first.draft.status,
  });

  /*
   * Simulate the same side-effect request
   * being executed again because a response
   * was lost or a workflow retried.
   */
  const second = createAppointmentDraft({
    patientId: "P-100",

    trialId: "CARDIO-101",

    site,

    date,
  });

  logger.info({
    traceId,

    event: "appointment_draft_repeated",

    draftId: second.draft.id,

    created: second.created,

    sameDraft: first.draft.id === second.draft.id,
  });

  logger.info({
    traceId,

    event: "human_approval_required",

    draftId: first.draft.id,

    status: first.draft.status,
  });

  logger.info({
    traceId,

    event: "workflow_completed",

    outcome: "PENDING_HUMAN_APPROVAL",
  });
}

main().catch((error) => {
  logger.error({
    event: "workflow_failed",

    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
