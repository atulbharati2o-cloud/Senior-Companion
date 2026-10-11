import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const connectionString = process.env.DATABASE_URL || "postgresql://companion:companion_secret@localhost:5432/senior_companion";

// Connection pool for queries
export const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

export * from "./schema";
export { eq, ne, gt, gte, lt, lte, and, or, desc, asc, sql } from "drizzle-orm";
