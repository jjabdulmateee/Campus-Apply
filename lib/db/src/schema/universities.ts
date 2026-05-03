import { pgTable, serial, text, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const universityTypeEnum = pgEnum("university_type", ["public", "private", "semi_government"]);

export const universitiesTable = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  province: text("province").notNull(),
  city: text("city").notNull(),
  type: universityTypeEnum("type").notNull(),
  ranking: integer("ranking"),
  established: integer("established"),
  website: text("website"),
  description: text("description"),
  logoUrl: text("logo_url"),
  applicationDeadline: text("application_deadline"),
  deadlineType: text("deadline_type"),
  applicationFeeRequired: boolean("application_fee_required").default(true),
  essayRequired: boolean("essay_required").default(true),
  acceptsTransfer: boolean("accepts_transfer").default(false),
  isFeatured: boolean("is_featured").default(false),
  admissionOpen: boolean("admission_open").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUniversitySchema = createInsertSchema(universitiesTable).omit({ id: true, createdAt: true });
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type University = typeof universitiesTable.$inferSelect;

export const degreeEnum = pgEnum("degree", [
  "BS", "BE", "BBA", "MBBS", "BDS", "LLB", "MA", "MSc", "MBA", "MS", "MPhil", "PhD", "other",
]);

export const programsTable = pgTable("programs", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").notNull(),
  name: text("name").notNull(),
  department: text("department"),
  degree: degreeEnum("degree").notNull(),
  duration: integer("duration"),
  seats: integer("seats"),
  entryTest: text("entry_test"),
  feePerSemester: numeric("fee_per_semester"),
  description: text("description"),
  applicationDeadline: text("application_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProgramSchema = createInsertSchema(programsTable).omit({ id: true, createdAt: true });
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programsTable.$inferSelect;

export const userCollegesTable = pgTable("user_colleges", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  universityId: integer("university_id").notNull(),
  status: text("status").notNull().default("researching"),
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  payload: text("payload"),
  signature: text("signature"),
  submittedAt: timestamp("submitted_at"),
});

export type UserCollege = typeof userCollegesTable.$inferSelect;
