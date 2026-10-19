/** True when running with NODE_ENV=production (public deployment). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Hardcoded demo accounts (student@pakmail.pk, admin@pakmail.pk, …) are never
 * created automatically. A developer must opt in with SEED_DEMO_ACCOUNTS=true,
 * and even then only outside production.
 */
export function isDemoSeedingEnabled(): boolean {
  return !isProduction() && process.env.SEED_DEMO_ACCOUNTS === "true";
}
