import { runAgent } from "./agent.js";

async function main() {
  const result = await runAgent(
    `
Patient P-100 wants to participate in CARDIO-101.

Check whether Cairo Medical Center has availability
on 2026-09-23.

If it is available, create an appointment draft
for that date.
    `.trim(),
  );

  console.log("\nFinal response:\n", result);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
