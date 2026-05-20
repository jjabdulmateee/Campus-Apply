CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."recommender_status" AS ENUM('pending', 'submitted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."ticket_category" AS ENUM('application_tips', 'document_uploads', 'technical_issues', 'university_specifics', 'other');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'admin', 'counselor');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('cnic_front', 'cnic_back', 'b_form', 'matric_marksheet', 'fsc_transcript', 'a_level_transcript', 'o_level_transcript', 'passport_photo', 'school_report', 'other');--> statement-breakpoint
CREATE TYPE "public"."academic_level" AS ENUM('matric', 'intermediate', 'a_levels', 'o_levels', 'bachelors', 'other');--> statement-breakpoint
CREATE TYPE "public"."activity_category" AS ENUM('sports', 'arts', 'community_service', 'academics', 'religious', 'leadership', 'work', 'other');--> statement-breakpoint
CREATE TYPE "public"."essay_type" AS ENUM('personal_statement', 'supplemental', 'short_answer');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."test_name" AS ENUM('SAT', 'ACT', 'IELTS', 'TOEFL', 'NTS', 'ECAT', 'MDCAT', 'HAT', 'other');--> statement-breakpoint
CREATE TYPE "public"."degree" AS ENUM('BS', 'BE', 'BBA', 'MBBS', 'BDS', 'LLB', 'MA', 'MSc', 'MBA', 'MS', 'MPhil', 'PhD', 'other');--> statement-breakpoint
CREATE TYPE "public"."university_type" AS ENUM('public', 'private', 'semi_government');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"university_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"admin_notes" text,
	"decision_reason" text,
	"reviewed_at" timestamp,
	"applied_at" timestamp DEFAULT now(),
	"submitted_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_remarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"admin_name" text NOT NULL,
	"remark" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"question_key" text NOT NULL,
	"question_text" text NOT NULL,
	"answer" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "counselor_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"counselor_user_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"school_report_object_path" text,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"student_id" text,
	"type" text DEFAULT 'decision' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"application_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recommenders" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"subject_taught" text NOT NULL,
	"relationship" text,
	"status" "recommender_status" DEFAULT 'pending' NOT NULL,
	"invite_token" text,
	"token_used" boolean DEFAULT false NOT NULL,
	"letter_content" text,
	"years_known" text,
	"invited_at" timestamp DEFAULT now(),
	"submitted_at" timestamp,
	CONSTRAINT "recommenders_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"student_name" text NOT NULL,
	"student_email" text NOT NULL,
	"category" "ticket_category" DEFAULT 'other' NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"admin_reply" text,
	"admin_id" integer,
	"admin_name" text,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email_on_status_change" boolean DEFAULT true NOT NULL,
	"deadline_reminders" boolean DEFAULT true NOT NULL,
	"weekly_digest" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"mobile_number" text,
	"student_id" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"university_id" integer,
	"avatar_url" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"verification_token" text,
	"verification_token_expiry" timestamp,
	"password_reset_token" text,
	"password_reset_token_expiry" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"category" "document_category" NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"object_path" text NOT NULL,
	"is_verified" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "academic_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"institution" text NOT NULL,
	"level" "academic_level" NOT NULL,
	"board" text,
	"passing_year" integer NOT NULL,
	"total_marks" integer,
	"obtained_marks" integer,
	"fsc_part1_marks" integer,
	"fsc_part2_marks" integer,
	"percentage" numeric,
	"grade_or_gpa" text,
	"subjects" text,
	"class_size" integer,
	"class_rank" integer,
	"class_rank_type" text,
	"gpa_scale" text,
	"honors" text,
	"courses_json" text,
	"transcript_doc_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"name" text NOT NULL,
	"category" "activity_category" NOT NULL,
	"role" text NOT NULL,
	"organization" text,
	"start_year" integer,
	"end_year" integer,
	"hours_per_week" integer,
	"description" text,
	"is_currently_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "essays" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"prompt" text NOT NULL,
	"content" text,
	"type" "essay_type" NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"father_name" text,
	"mother_name" text,
	"mother_occupation" text,
	"mother_education_level" text,
	"household_income_tier" text,
	"sibling_count" integer,
	"date_of_birth" text,
	"gender" "gender",
	"cnic_number" text,
	"nationality" text DEFAULT 'Pakistani',
	"religion" text,
	"province" text,
	"city" text,
	"address" text,
	"phone_number" text,
	"preferred_contact" text,
	"email" text NOT NULL,
	"middle_name" text,
	"zip_code" text,
	"student_type" text,
	"guardian_name" text,
	"guardian_relation" text,
	"guardian_email" text,
	"previous_college" text,
	"cnic_document_url" text,
	"transcript_url" text,
	"photo_url" text,
	"birth_city" text,
	"birth_country" text,
	"languages_json" text,
	"fee_waiver_eligible" boolean,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_profiles_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "test_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"test_name" "test_name" NOT NULL,
	"score" text NOT NULL,
	"max_score" text,
	"test_date" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"university_id" integer NOT NULL,
	"name" text NOT NULL,
	"department" text,
	"degree" "degree" NOT NULL,
	"duration" integer,
	"seats" integer,
	"entry_test" text,
	"fee_per_semester" numeric,
	"description" text,
	"application_deadline" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"province" text NOT NULL,
	"city" text NOT NULL,
	"type" "university_type" NOT NULL,
	"ranking" integer,
	"established" integer,
	"website" text,
	"description" text,
	"logo_url" text,
	"application_deadline" text,
	"deadline_type" text,
	"application_fee_required" boolean DEFAULT true,
	"essay_required" boolean DEFAULT true,
	"accepts_transfer" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"admission_open" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_colleges" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"university_id" integer NOT NULL,
	"status" text DEFAULT 'researching' NOT NULL,
	"added_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"payload" text,
	"signature" text,
	"submitted_at" timestamp
);
