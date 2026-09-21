import { db } from "../../shared/db.js";

import {
  answerQuestion,
} from "./rag.js";

async function main() {
  const question = `
  Does CARDIO-101 allow patients who are allergic to penicillin?
  `.trim();

  const answer =
    await answerQuestion(
      question,
      "CARDIO-101",
    );

  console.dir(
    answer,
    {
      depth: null,
    },
  );
}

main()
  .catch((error) => {
    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });