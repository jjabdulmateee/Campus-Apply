// Cross-platform replacement for the previous `sh -c` preinstall hook.
//
//   1. Removes a stray package-lock.json or yarn.lock (we use pnpm).
//   2. Aborts ONLY when we have positive, unambiguous evidence the install
//      is being run by npm or yarn. pnpm normally sets
//      `npm_config_user_agent` to "pnpm/<ver>...", but on some Windows +
//      corepack + globally-installed pnpm setups the variable is missing
//      or oddly formatted. We deliberately avoid sniffing `npm_execpath`
//      because the npm-installed pnpm binary itself lives under
//      `...\npm\node_modules\pnpm\bin\pnpm.mjs`, which is impossible to
//      distinguish from real npm by path alone.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const stray of ["package-lock.json", "yarn.lock"]) {
  const p = path.join(root, stray);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {
      // best effort — ignore errors
    }
  }
}

const ua = process.env.npm_config_user_agent ?? "";

// Only block on a *positive* npm/yarn user-agent. Empty / unknown UA → allow.
if (ua.startsWith("npm/") || ua.startsWith("yarn/")) {
  console.error(
    "\nThis workspace uses pnpm. Install pnpm and run `pnpm install` instead:\n" +
      "  npm install -g pnpm\n",
  );
  process.exit(1);
}
