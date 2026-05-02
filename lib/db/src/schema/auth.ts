import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  mobileNumber: text("mobile_number"),
  studentId: text("student_id").unique(),
  role: userRoleEnum("role").notNull().default("student"),
  avatarUrl: text("avatar_url"),
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

export const adminRemarksTable = pgTable("admin_remarks", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  adminId: integer("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  remark: text("remark").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminRemark = typeof adminRemarksTable.$inferSelect;
export type InsertAdminRemark = typeof adminRemarksTable.$inferInsert;

export const userPreferencesTable = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  emailOnStatusChange: boolean("email_on_status_change").notNull().default(true),
  deadlineReminders: boolean("deadline_reminders").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
