import { pgTable, serial, text, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
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
  adminNotes: text("admin_notes"),
  decisionReason: text("decision_reason"),
  reviewedAt: timestamp("reviewed_at"),
  appliedAt: timestamp("applied_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  /** Simulated (demo) application-fee receipt — never a real payment id. */
  paymentTransactionRef: text("payment_transaction_ref"),
  paymentAmountPkr: integer("payment_amount_pkr"),
  paymentSimulatedAt: timestamp("payment_simulated_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({ id: true, appliedAt: true, updatedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;

/** Opaque JSON blobs — the snapshot stores whatever the row looked like at submit time. */
export type SnapshotRecord = Record<string, unknown>;

/**
 * Immutable copy of everything a university reviewer sees, frozen at the moment
 * an application moves from `draft` to `submitted`. One row per application;
 * never updated — later profile edits by the student do not touch it.
 */
export const applicationSnapshotsTable = pgTable("application_snapshots", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().unique(),
  studentId: text("student_id").notNull(),
  universityId: integer("university_id").notNull(),
  programId: integer("program_id").notNull(),
  version: integer("version").notNull().default(1),
  signature: text("signature"),
  profile: jsonb("profile").$type<SnapshotRecord | null>(),
  academics: jsonb("academics").$type<SnapshotRecord[]>().notNull(),
  tests: jsonb("tests").$type<SnapshotRecord[]>().notNull(),
  activities: jsonb("activities").$type<SnapshotRecord[]>().notNull(),
  essays: jsonb("essays").$type<SnapshotRecord[]>().notNull(),
  answers: jsonb("answers").$type<SnapshotRecord[]>().notNull(),
  documents: jsonb("documents").$type<SnapshotRecord[]>().notNull(),
  submittedAt: timestamp("submitted_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ApplicationSnapshot = typeof applicationSnapshotsTable.$inferSelect;
