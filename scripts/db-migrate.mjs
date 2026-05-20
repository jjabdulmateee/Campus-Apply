// Applies pending Drizzle SQL migrations in strict order (production-safe).
// Requires DATABASE_URL. Run during deploy before starting the API server.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");

if (fs.existsSync(envFile) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envFile);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Add it to your .env file at the repo root, " +
      "then re-run this command.",
  );
  process.exit(1);
}

console.log("Applying Drizzle migrations from lib/db/migrations …");

const { status } = spawnSync(
  "pnpm",
  [
    "--filter",
    "@workspace/db",
    "exec",
    "drizzle-kit",
    "migrate",
    "--config",
    "./drizzle.config.ts",
  ],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (status === 0) {
  console.log("Migrations applied successfully.");
}

process.exit(status ?? 0);
