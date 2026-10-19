import app from "./app";
import { logger } from "./lib/logger";
import { seedDemoUser } from "./lib/seed-demo";
import { isDemoSeedingEnabled } from "./lib/env";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  if (isDemoSeedingEnabled()) {
    seedDemoUser();
  } else {
    logger.info(
      "Demo account seeding disabled (set SEED_DEMO_ACCOUNTS=true in development to enable)",
    );
  }
});
