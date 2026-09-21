export type EvalCase = {
  name: string;

  question: string;

  trialId: string;

  expectedAnswer: "YES" | "NO" | "INSUFFICIENT_INFORMATION";

  expectedHeading?: string[];
};

export const evalCases: EvalCase[] = [
  {
    name: "renal impairment exclusion",

    question:
      "A 52-year-old patient has hypertension, blood pressure of 155/95, and severe renal impairment. Can the patient participate in CARDIO-101?",

    trialId: "CARDIO-101",

    expectedAnswer: "NO",

    expectedHeading: ["Exclusion Criteria"],
  },

  {
    name: "pregnancy exclusion",

    question: "Can a pregnant patient participate in CARDIO-101?",

    trialId: "CARDIO-101",

    expectedAnswer: "NO",

    expectedHeading: ["Exclusion Criteria"],
  },

  {
    name: "age exclusion",

    question: "Can an 80-year-old patient participate in CARDIO-101?",

    trialId: "CARDIO-101",

    expectedAnswer: "NO",

    expectedHeading: ["Inclusion Criteria"],
  },

  {
    name: "penicillin unknown",

    question: "Does CARDIO-101 allow patients who are allergic to penicillin?",

    trialId: "CARDIO-101",

    expectedAnswer: "INSUFFICIENT_INFORMATION",
  },

  {
    name: "diabetes unknown",

    question: "Can a patient with diabetes participate in CARDIO-101?",

    trialId: "CARDIO-101",

    expectedAnswer: "INSUFFICIENT_INFORMATION",
  },

  {
    name: "missing exclusion information",

    question:
      "A 52-year-old patient has hypertension and blood pressure of 155/95. Can the patient participate in CARDIO-101?",

    trialId: "CARDIO-101",

    expectedAnswer: "INSUFFICIENT_INFORMATION",

    expectedHeading: ["Inclusion Criteria","Exclusion Criteria"],
  },

  {
    name: "trial condition",

    question: "Is CARDIO-101 a hypertension trial?",

    trialId: "CARDIO-101",

    expectedAnswer: "YES",

    expectedHeading: ["General Information"],
  },

  {
    name: "Cairo site",

    question: "Is Cairo Medical Center listed as a CARDIO-101 trial site?",

    trialId: "CARDIO-101",

    expectedAnswer: "YES",

    expectedHeading: ["Trial Sites"],
  },
];
