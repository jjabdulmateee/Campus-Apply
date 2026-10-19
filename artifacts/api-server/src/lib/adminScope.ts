import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AdminScope =
  | { kind: "global" }
  | { kind: "university"; universityId: number }
  | { kind: "none" };

/**
 * Resolves admin scope from the live users row — not the JWT — so a staff
 * account cannot widen access by editing a cookie or query string.
 */
export async function resolveAdminScope(userId: number): Promise<AdminScope> {
  const admin = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
    columns: { role: true, universityId: true },
  });
  if (!admin || admin.role !== "admin") return { kind: "none" };
  if (admin.universityId == null) return { kind: "global" };
  return { kind: "university", universityId: admin.universityId };
}

/** Returns the admin's scoped university id, or `undefined` for global admins. */
export async function getAdminUniversityScope(
  userId: number,
): Promise<number | undefined> {
  const scope = await resolveAdminScope(userId);
  if (scope.kind === "university") return scope.universityId;
  return undefined;
}

export function universityInAdminScope(
  appUniversityId: number,
  scopeUniversityId: number | undefined,
): boolean {
  if (scopeUniversityId === undefined) return true;
  return appUniversityId === scopeUniversityId;
}

export async function assertAdminApplicationAccess(
  req: Request,
  res: Response,
  appUniversityId: number,
): Promise<boolean> {
  const scope = await resolveAdminScope(req.user!.userId);
  if (scope.kind === "none") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  if (scope.kind === "university" && scope.universityId !== appUniversityId) {
    res.status(403).json({ error: "You do not have access to this application" });
    return false;
  }
  return true;
}

/** Global (unscoped) system administrators only. */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Super-admin access required" });
    return;
  }
  const scope = await resolveAdminScope(req.user.userId);
  if (scope.kind !== "global") {
    res.status(403).json({ error: "Super-admin access required" });
    return;
  }
  next();
}
