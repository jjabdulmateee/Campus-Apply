import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const applicationStatusEnum = pgEnum("application_status", [
  "draft", "submitted", "under_review", "accepted", "rejected", "waitlisted", "withdrawn",
]);

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  universityId: integer("university_id").notNull(),
  programId: integer("program_id").notNull(),
  status: applicationStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  appliedAt: timestamp("applied_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, appliedAt: true, updatedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
