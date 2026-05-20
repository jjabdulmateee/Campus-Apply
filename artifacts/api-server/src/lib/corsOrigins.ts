/** Allowed browser origins for credentialed CORS requests. */
export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim() || "http://localhost:3000";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
