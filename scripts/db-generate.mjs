// Generates versioned SQL migrations from Drizzle schema files.
// Use after schema changes: pnpm run db:generate -- --name describe_change

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");

if (fs.existsSync(envFile) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envFile);
}

const passthrough = process.argv.slice(2);
const args = ["generate", "--config", "./drizzle.config.ts", ...passthrough];

const { status } = spawnSync(
  "pnpm",
  ["--filter", "@workspace/db", "exec", "drizzle-kit", ...args],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(status ?? 0);
