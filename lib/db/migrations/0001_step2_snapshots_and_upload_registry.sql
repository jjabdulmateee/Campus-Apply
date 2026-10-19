CREATE TABLE "application_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"university_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"signature" text,
	"profile" jsonb,
	"academics" jsonb NOT NULL,
	"tests" jsonb NOT NULL,
	"activities" jsonb NOT NULL,
	"essays" jsonb NOT NULL,
	"answers" jsonb NOT NULL,
	"documents" jsonb NOT NULL,
	"submitted_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "application_snapshots_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_path" text NOT NULL,
	"uploader_user_id" integer NOT NULL,
	"purpose" text DEFAULT 'document' NOT NULL,
	"original_name" text,
	"content_type" text,
	"size_bytes" integer,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "uploads_object_path_unique" UNIQUE("object_path")
);
