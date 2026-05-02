import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  mobileNumber: text("mobile_number"),
  studentId: text("student_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const applicationAnswersTable = pgTable("application_answers", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  studentId: text("student_id").notNull(),
  questionKey: text("question_key").notNull(),
  questionText: text("question_text").notNull(),
  answer: text("answer"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ApplicationAnswer = typeof applicationAnswersTable.$inferSelect;
