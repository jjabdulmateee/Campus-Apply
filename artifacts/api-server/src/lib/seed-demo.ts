import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function seedDemoUser(): Promise<void> {
  try {
    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, "student@pakmail.pk"),
    });
    if (existing) return;

    const passwordHash = await bcrypt.hash("demo123", 12);
    await db.insert(usersTable).values({
      email: "student@pakmail.pk",
      passwordHash,
      fullName: "Demo Student",
      studentId: "demo-student-001",
    });

    logger.info("Demo user seeded: student@pakmail.pk / demo123");
  } catch (err) {
    logger.error({ err }, "Failed to seed demo user");
  }
}
