/** True when running with NODE_ENV=production (public deployment). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
