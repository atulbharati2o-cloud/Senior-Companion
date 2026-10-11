import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, client } from "./index";
import * as path from "path";

async function runMigrations() {
  console.log("Applying Drizzle migrations to PostgreSQL...");
  try {
    await migrate(db, { migrationsFolder: path.resolve(__dirname, "../drizzle") });
    console.log("Migrations successfully applied!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
