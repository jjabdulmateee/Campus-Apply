import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { applicationsTable, userCollegesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getStudentId } from "./auth";

/**
 * Blocks edits to core application sections after any college/application
 * has been submitted — mirrors Common App lock behaviour.
 */
export async function assertApplicationSectionsEditable(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sid = getStudentId(req);

    const [submittedApp, submittedCollege] = await Promise.all([
      db
        .select({ id: applicationsTable.id })
        .from(applicationsTable)
        .where(
          and(
            eq(applicationsTable.studentId, sid),
            eq(applicationsTable.status, "submitted"),
          ),
        )
        .limit(1),
      db
        .select({ id: userCollegesTable.id })
        .from(userCollegesTable)
        .where(
          and(
            eq(userCollegesTable.studentId, sid),
            eq(userCollegesTable.status, "submitted"),
          ),
        )
        .limit(1),
    ]);

    if (submittedApp.length > 0 || submittedCollege.length > 0) {
      res.status(403).json({
        error:
          "Your application has been submitted and can no longer be edited. " +
          "Contact the university if you need to make changes.",
      });
      return;
    }

    next();
  } catch (err) {
    req.log.error({ err }, "submit-lock check failed");
    res.status(500).json({ error: "Internal server error" });
  }
}
