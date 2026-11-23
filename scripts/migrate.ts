import { migrate } from "../src/server/migrate";
import { closeDatabase } from "../src/server/db";
migrate()
  .then(() => console.log("PostgreSQL migrations are current."))
  .catch(() => {
    console.error("Migration failed. Check local PostgreSQL and DATABASE_URL.");
    process.exitCode = 1;
  })
  .finally(closeDatabase);
