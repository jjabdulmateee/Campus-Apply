// Wrapper around `drizzle-kit push` that auto-loads the repo-root .env file
// so the user doesn't have to export DATABASE_URL manually before running it.
// Cross-platform (PowerShell, cmd, bash, zsh).

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

const { status } = spawnSync(
  "pnpm",
  [
    "--filter",
    "@workspace/db",
    "exec",
    "drizzle-kit",
    "push",
    "--config",
    "./drizzle.config.ts",
  ],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

process.exit(status ?? 0);
