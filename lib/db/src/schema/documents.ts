import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const documentCategoryEnum = pgEnum("document_category", [
  "cnic_front",
  "cnic_back",
  "b_form",
  "matric_marksheet",
  "fsc_transcript",
  "a_level_transcript",
  "o_level_transcript",
  "passport_photo",
  "school_report",
  "other",
]);

/**
 * Registry of every upload slot handed out by the API. Written when a signed
 * upload URL is issued; consulted whenever a client tries to bind an objectPath
 * to a profile, document, avatar or school report, so a user can only register
 * objects they themselves uploaded.
 */
export const uploadsTable = pgTable("uploads", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull().unique(),
  uploaderUserId: integer("uploader_user_id").notNull(),
  purpose: text("purpose").notNull().default("document"),
  originalName: text("original_name"),
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type Upload = typeof uploadsTable.$inferSelect;

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  category: documentCategoryEnum("category").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  objectPath: text("object_path").notNull(),
  isVerified: boolean("is_verified").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});
