import { pgTable, serial, text, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"]);

export const studentProfilesTable = pgTable("student_profiles", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  motherOccupation: text("mother_occupation"),
  motherEducationLevel: text("mother_education_level"),
  householdIncomeTier: text("household_income_tier"),
  siblingCount: integer("sibling_count"),
  dateOfBirth: text("date_of_birth"),
  gender: genderEnum("gender"),
  cnicNumber: text("cnic_number"),
  nationality: text("nationality").default("Pakistani"),
  religion: text("religion"),
  province: text("province"),
  city: text("city"),
  address: text("address"),
  phoneNumber: text("phone_number"),
  preferredContact: text("preferred_contact"),
  email: text("email").notNull(),
  middleName: text("middle_name"),
  zipCode: text("zip_code"),
  studentType: text("student_type"),
  guardianName: text("guardian_name"),
  guardianRelation: text("guardian_relation"),
  guardianEmail: text("guardian_email"),
  previousCollege: text("previous_college"),
  cnicDocumentUrl: text("cnic_document_url"),
  transcriptUrl: text("transcript_url"),
  photoUrl: text("photo_url"),
  birthCity: text("birth_city"),
  birthCountry: text("birth_country"),
  languagesJson: text("languages_json"),
  feeWaiverEligible: boolean("fee_waiver_eligible"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStudentProfileSchema = createInsertSchema(studentProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;

export const academicLevelEnum = pgEnum("academic_level", ["matric", "intermediate", "a_levels", "o_levels", "bachelors", "other"]);

export const academicRecordsTable = pgTable("academic_records", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  institution: text("institution").notNull(),
  level: academicLevelEnum("level").notNull(),
  board: text("board"),
  passingYear: integer("passing_year").notNull(),
  totalMarks: integer("total_marks"),
  obtainedMarks: integer("obtained_marks"),
  fscPart1Marks: integer("fsc_part1_marks"),
  fscPart2Marks: integer("fsc_part2_marks"),
  percentage: numeric("percentage"),
  gradeOrGpa: text("grade_or_gpa"),
  subjects: text("subjects"),
  classSize: integer("class_size"),
  classRank: integer("class_rank"),
  classRankType: text("class_rank_type"),
  gpaScale: text("gpa_scale"),
  honors: text("honors"),
  coursesJson: text("courses_json"),
  transcriptDocUrl: text("transcript_doc_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAcademicRecordSchema = createInsertSchema(academicRecordsTable).omit({ id: true, createdAt: true });
export type InsertAcademicRecord = z.infer<typeof insertAcademicRecordSchema>;
export type AcademicRecord = typeof academicRecordsTable.$inferSelect;

export const testNameEnum = pgEnum("test_name", ["SAT", "ACT", "IELTS", "TOEFL", "NTS", "ECAT", "MDCAT", "HAT", "other"]);

export const testScoresTable = pgTable("test_scores", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  testName: testNameEnum("test_name").notNull(),
  score: text("score").notNull(),
  maxScore: text("max_score"),
  testDate: text("test_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTestScoreSchema = createInsertSchema(testScoresTable).omit({ id: true, createdAt: true });
export type InsertTestScore = z.infer<typeof insertTestScoreSchema>;
export type TestScore = typeof testScoresTable.$inferSelect;

export const activityCategoryEnum = pgEnum("activity_category", [
  "sports", "arts", "community_service", "academics", "religious", "leadership", "work", "other",
]);

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  name: text("name").notNull(),
  category: activityCategoryEnum("category").notNull(),
  role: text("role").notNull(),
  organization: text("organization"),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
  hoursPerWeek: integer("hours_per_week"),
  description: text("description"),
  isCurrentlyActive: boolean("is_currently_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;

export const essayTypeEnum = pgEnum("essay_type", ["personal_statement", "supplemental", "short_answer"]);

export const essaysTable = pgTable("essays", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  prompt: text("prompt").notNull(),
  content: text("content"),
  type: essayTypeEnum("type").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEssaySchema = createInsertSchema(essaysTable).omit({ id: true, updatedAt: true });
export type InsertEssay = z.infer<typeof insertEssaySchema>;
export type Essay = typeof essaysTable.$inferSelect;
