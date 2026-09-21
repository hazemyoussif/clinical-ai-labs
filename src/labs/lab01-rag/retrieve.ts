import { db } from "../../shared/db.js";
import { retrieve } from "./retrieval.js";

async function main() {
  const query =
    "Can a patient with serious kidney problems join CARDIO-101?";

  const results =
    await retrieve(
      query,
      "CARDIO-101",
      3,
    );

  console.table(
    results.map((result) => ({
      document:
        result.documentTitle,

      heading:
        result.heading,

      similarity:
        result.similarity.toFixed(4),
    })),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.end();
  });