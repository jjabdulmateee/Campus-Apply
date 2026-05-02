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
  "other",
]);

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
