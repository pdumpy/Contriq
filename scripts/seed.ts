import { seedDatabase } from "../src/server/seed";
import { closeDatabase } from "../src/server/db";
seedDatabase()
  .then((summary) => console.log("Synthetic evidence imported:", summary))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(closeDatabase);
