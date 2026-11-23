import { scoreCohort } from "../src/server/scoring";
import { closeDatabase } from "../src/server/db";
scoreCohort()
  .then((summary) => console.log("Whole cohort scoring:", summary))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Scoring failed");
    process.exitCode = 1;
  })
  .finally(closeDatabase);
