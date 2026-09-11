import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

const MIGRATIONS = ["001_payment_links.sql"];

export async function runMigrations(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
    for (const file of MIGRATIONS) {
      const sql = await readFile(join(dir, file), "utf8");
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

const invokedViaViteNode = (process.argv[1] ?? "").includes("vite-node");
if (invokedViaViteNode) {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is not set; nothing to migrate.");
    process.exit(1);
  }
  await runMigrations(connectionString);
  console.log("Migrations applied.");
}
