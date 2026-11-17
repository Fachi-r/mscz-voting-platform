import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { reset } from "drizzle-seed";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set in your environment.");
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log("Clearing database...");
  await reset(db, schema);
  console.log("Database cleared.");
  await client.end();
}

main().catch(async (err) => {
  console.error("Failed to reset database:", err);
  await client.end();
  process.exit(1);
});
