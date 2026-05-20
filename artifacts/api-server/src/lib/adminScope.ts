import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Returns the admin's scoped university id, or `undefined` for global admins. */
export async function getAdminUniversityScope(
  userId: number,
): Promise<number | undefined> {
  const admin = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
    columns: { universityId: true },
  });
  return admin?.universityId ?? undefined;
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
  const scope = await getAdminUniversityScope(req.user!.userId);
  if (!universityInAdminScope(appUniversityId, scope)) {
    res.status(403).json({ error: "You do not have access to this application" });
    return false;
  }
  return true;
}
