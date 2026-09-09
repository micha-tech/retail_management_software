CREATE TYPE "public"."credit_entry_type" AS ENUM('SALE', 'PAYMENT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'REVERSAL');--> statement-breakpoint
CREATE TABLE "credit_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_customers_name_phone_ck" CHECK ("credit_customers"."name" = trim("credit_customers"."name") AND char_length("credit_customers"."name") >= 2 AND "credit_customers"."phone" = trim("credit_customers"."phone") AND char_length("credit_customers"."phone") >= 7)
);
--> statement-breakpoint
CREATE TABLE "credit_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"sale_id" uuid,
	"type" "credit_entry_type" NOT NULL,
	"amount" bigint NOT NULL,
	"payment_method" "payment_method",
	"payment_bank_id" uuid,
	"reference" text,
	"notes" text,
	"due_date" timestamp with time zone,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_entries_amount_positive_ck" CHECK ("credit_entries"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "business_memberships" DROP CONSTRAINT "memberships_permissions_valid_ck";--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "credit_customer_id" uuid;--> statement-breakpoint
ALTER TABLE "credit_customers" ADD CONSTRAINT "credit_customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_customers_business_phone_uq" ON "credit_customers" USING btree ("business_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_customers_business_id_uq" ON "credit_customers" USING btree ("business_id","id");--> statement-breakpoint
CREATE INDEX "credit_customers_business_name_idx" ON "credit_customers" USING btree ("business_id","name");--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_customer_id_credit_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."credit_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_tenant_branch_fk" FOREIGN KEY ("business_id","branch_id") REFERENCES "public"."branches"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_tenant_customer_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."credit_customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_tenant_bank_fk" FOREIGN KEY ("business_id","payment_bank_id") REFERENCES "public"."payment_banks"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_entries" ADD CONSTRAINT "credit_entries_membership_fk" FOREIGN KEY ("business_id","recorded_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_entries_sale_charge_uq" ON "credit_entries" USING btree ("sale_id") WHERE "credit_entries"."type" = 'SALE';--> statement-breakpoint
CREATE INDEX "credit_entries_customer_created_idx" ON "credit_entries" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_entries_business_branch_created_idx" ON "credit_entries" USING btree ("business_id","branch_id","created_at");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_credit_customer_fk" FOREIGN KEY ("business_id","credit_customer_id") REFERENCES "public"."credit_customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "memberships_permissions_valid_ck" CHECK ("business_memberships"."permissions" IS NULL OR "business_memberships"."permissions" <@ ARRAY['business:manage','dashboard:read','branch:read','branch:manage','team:manage','product:manage','inventory:read','inventory:manage','pos:operate','sales:read','credit:manage','report:read','audit:read']::text[]);
