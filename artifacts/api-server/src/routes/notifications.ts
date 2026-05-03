import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { verifyJWT } from "../middleware/auth";

const router = Router();

router.use(verifyJWT);

router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  try {
    const result = await db.execute(
      sql`SELECT * FROM notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`,
    );
    const rows = result.rows as Array<Record<string, unknown>>;
    const unreadCount = rows.filter((n) => !n.is_read).length;
    return res.json({ notifications: rows, unreadCount });
  } catch (err) {
    req.log.error({ err }, "get notifications error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/read-all", async (req, res) => {
  const userId = req.user!.userId;
  try {
    await db.execute(sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`);
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "mark all read error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/read", async (req, res) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    await db.execute(
      sql`UPDATE notifications SET is_read = true WHERE id = ${id} AND user_id = ${userId}`,
    );
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "mark read error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
