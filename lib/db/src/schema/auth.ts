import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved"]);
export const ticketCategoryEnum = pgEnum("ticket_category", [
  "application_tips",
  "document_uploads",
  "technical_issues",
  "university_specifics",
  "other",
]);

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

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  studentName: text("student_name").notNull(),
  studentEmail: text("student_email").notNull(),
  category: ticketCategoryEnum("category").notNull().default("other"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  adminReply: text("admin_reply"),
  adminId: integer("admin_id"),
  adminName: text("admin_name"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type InsertSupportTicket = typeof supportTicketsTable.$inferInsert;

export const recommenderStatusEnum = pgEnum("recommender_status", ["pending", "submitted", "declined"]);

export const recommendersTable = pgTable("recommenders", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  subjectTaught: text("subject_taught").notNull(),
  relationship: text("relationship"),
  status: recommenderStatusEnum("status").notNull().default("pending"),
  inviteToken: text("invite_token").unique(),
  tokenUsed: boolean("token_used").notNull().default(false),
  letterContent: text("letter_content"),
  yearsKnown: text("years_known"),
  invitedAt: timestamp("invited_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
});

export type Recommender = typeof recommendersTable.$inferSelect;
export type InsertRecommender = typeof recommendersTable.$inferInsert;
