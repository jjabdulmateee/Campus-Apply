ALTER TABLE "applications" ADD COLUMN "payment_transaction_ref" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "payment_amount_pkr" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "payment_simulated_at" timestamp;