ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_terms_nonnegative_ck";--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "lead_time_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_terms_nonnegative_ck" CHECK ("suppliers"."payment_terms_days" >= 0 AND "suppliers"."lead_time_days" >= 0);