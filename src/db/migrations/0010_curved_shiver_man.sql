CREATE TABLE "payment_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"branch_name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_banks_account_ck" CHECK ("payment_banks"."bank_name" = trim("payment_banks"."bank_name") AND char_length("payment_banks"."bank_name") > 0 AND "payment_banks"."account_name" = trim("payment_banks"."account_name") AND char_length("payment_banks"."account_name") > 0 AND "payment_banks"."account_number" ~ '^[0-9]+$')
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_bank_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_banks" ADD CONSTRAINT "payment_banks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_banks_business_account_uq" ON "payment_banks" USING btree ("business_id","account_number");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_banks_business_id_uq" ON "payment_banks" USING btree ("business_id","id");--> statement-breakpoint
CREATE INDEX "payment_banks_business_active_idx" ON "payment_banks" USING btree ("business_id","active");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_bank_fk" FOREIGN KEY ("business_id","payment_bank_id") REFERENCES "public"."payment_banks"("business_id","id") ON DELETE restrict ON UPDATE no action;