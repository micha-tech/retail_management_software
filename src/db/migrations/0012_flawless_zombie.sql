CREATE TABLE "demo_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"work_email" text NOT NULL,
	"phone" text NOT NULL,
	"business_name" text NOT NULL,
	"business_type" text NOT NULL,
	"location_count" text NOT NULL,
	"employee_count" text NOT NULL,
	"current_software" text,
	"primary_challenge" text NOT NULL,
	"preferred_contact" text NOT NULL,
	"message" text,
	"consent" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_requests_email_normalized_ck" CHECK ("demo_requests"."work_email" = lower(trim("demo_requests"."work_email")))
);
--> statement-breakpoint
CREATE INDEX "demo_requests_created_idx" ON "demo_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "demo_requests_email_created_idx" ON "demo_requests" USING btree ("work_email","created_at");