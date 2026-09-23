import { z } from "zod";
import type OpenAI from "openai";

export const toolDefinitions: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "get_trial",
    description:
      "Get basic information about a clinical trial.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        trialId: {
          type: "string",
          description:
            "Clinical trial identifier such as CARDIO-101",
        },
      },
      required: ["trialId"],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "check_site_availability",
    description:
      "Check appointment availability for a trial site on a specific date.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        site: {
          type: "string",
        },
        date: {
          type: "string",
          description:
            "Date in YYYY-MM-DD format",
        },
      },
      required: [
        "site",
        "date",
      ],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "create_appointment_draft",
    description:
      "Create an appointment draft. This does not confirm or book the appointment.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        patientId: {
          type: "string",
        },
        trialId: {
          type: "string",
        },
        site: {
          type: "string",
        },
        date: {
          type: "string",
        },
      },
      required: [
        "patientId",
        "trialId",
        "site",
        "date",
      ],
      additionalProperties: false,
    },
  },
];

const GetTrialArgs = z.object({
  trialId: z.string().min(1),
});

const CheckAvailabilityArgs = z.object({
  site: z.string().min(1),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const CreateAppointmentDraftArgs = z.object({
  patientId: z.string().min(1),

  trialId: z.string().min(1),

  site: z.string().min(1),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const trials = {
  "CARDIO-101": {
    trialId: "CARDIO-101",
    phase: "Phase III",
    condition: "Hypertension",
    sites: ["Cairo Medical Center", "Alexandria Clinical Institute"],
  },
};

export async function executeTool(name: string, rawArguments: string) {
  const parsedArguments = JSON.parse(rawArguments);

  switch (name) {
    case "get_trial": {
      const args = GetTrialArgs.parse(parsedArguments);

      const trial = trials[args.trialId as keyof typeof trials];

      if (!trial) {
        return {
          ok: false,
          error: "Trial not found",
        };
      }

      return {
        ok: true,
        data: trial,
      };
    }

    case "check_site_availability": {
      const args = CheckAvailabilityArgs.parse(parsedArguments);

      const available =
        args.site === "Cairo Medical Center" && args.date === "2026-09-23";

      return {
        ok: true,

        data: {
          site: args.site,
          date: args.date,
          available,
        },
      };
    }

    case "create_appointment_draft": {
      const args = CreateAppointmentDraftArgs.parse(parsedArguments);

      return {
        ok: true,

        data: {
          status: "PENDING_HUMAN_APPROVAL",

          draft: args,
        },
      };
    }

    default:
      return {
        ok: false,
        error: `Tool not allowed: ${name}`,
      };
  }
}
