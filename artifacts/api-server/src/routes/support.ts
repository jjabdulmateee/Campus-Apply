import { Router } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { verifyJWT } from "../middleware/auth";

const router = Router();
router.use(verifyJWT);

/** GET /api/support/tickets — list own tickets */
router.get("/tickets", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, userId))
      .orderBy(desc(supportTicketsTable.createdAt));
    res.json({ tickets });
  } catch (err) {
    req.log.error({ err }, "list tickets error");
    res.status(500).json({ error: "Internal server error" });
  }
});

const TicketCategoryEnum = z.enum([
  "application_tips",
  "document_uploads",
  "technical_issues",
  "university_specifics",
  "other",
]);

/** POST /api/support/tickets — create a support ticket */
router.post("/tickets", async (req, res) => {
  try {
    const schema = z.object({
      category: TicketCategoryEnum,
      subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
      message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message too long"),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.errors[0].message });
      return;
    }

    const userId = req.user!.userId;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        userId,
        studentName: user.fullName,
        studentEmail: user.email,
        category: body.data.category,
        subject: body.data.subject,
        message: body.data.message,
      })
      .returning();

    res.status(201).json({ ticket });
  } catch (err) {
    req.log.error({ err }, "create ticket error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
