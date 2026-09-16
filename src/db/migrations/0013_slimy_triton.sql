CREATE TYPE "public"."purchase_order_status" AS ENUM('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"ordered_quantity" integer NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost" bigint NOT NULL,
	CONSTRAINT "purchase_order_items_quantities_ck" CHECK ("purchase_order_items"."ordered_quantity" > 0 AND "purchase_order_items"."received_quantity" >= 0 AND "purchase_order_items"."received_quantity" <= "purchase_order_items"."ordered_quantity" AND "purchase_order_items"."unit_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"reference" text,
	"notes" text,
	"paid_by" uuid NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_order_payments_amount_positive_ck" CHECK ("purchase_order_payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"supplier_reference" text,
	"status" "purchase_order_status" DEFAULT 'DRAFT' NOT NULL,
	"expected_at" timestamp with time zone,
	"ordered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid NOT NULL,
	"ordered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"tax_id" text,
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_terms_nonnegative_ck" CHECK ("suppliers"."payment_terms_days" >= 0)
);
--> statement-breakpoint
ALTER TABLE "business_memberships" DROP CONSTRAINT "memberships_permissions_valid_ck";--> statement-breakpoint
ALTER TABLE "stock_receipts" ADD COLUMN "purchase_order_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_business_id_uq" ON "suppliers" USING btree ("business_id","id");--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_payments" ADD CONSTRAINT "purchase_order_payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_payments" ADD CONSTRAINT "purchase_order_payments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_payments" ADD CONSTRAINT "purchase_order_payments_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_payments" ADD CONSTRAINT "purchase_order_payments_membership_fk" FOREIGN KEY ("business_id","paid_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_branch_fk" FOREIGN KEY ("business_id","branch_id") REFERENCES "public"."branches"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_supplier_fk" FOREIGN KEY ("business_id","supplier_id") REFERENCES "public"."suppliers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_creator_membership_fk" FOREIGN KEY ("business_id","created_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_orderer_membership_fk" FOREIGN KEY ("business_id","ordered_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_items_order_product_uq" ON "purchase_order_items" USING btree ("purchase_order_id","product_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_product_idx" ON "purchase_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "purchase_order_payments_order_paid_idx" ON "purchase_order_payments" USING btree ("purchase_order_id","paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_business_number_uq" ON "purchase_orders" USING btree ("business_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_business_branch_id_uq" ON "purchase_orders" USING btree ("business_id","branch_id","id");--> statement-breakpoint
CREATE INDEX "purchase_orders_business_status_created_idx" ON "purchase_orders" USING btree ("business_id","status","created_at");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_created_idx" ON "purchase_orders" USING btree ("supplier_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_business_name_uq" ON "suppliers" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "suppliers_business_active_idx" ON "suppliers" USING btree ("business_id","active");--> statement-breakpoint
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_receipts_purchase_order_idx" ON "stock_receipts" USING btree ("purchase_order_id");--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "memberships_permissions_valid_ck" CHECK ("business_memberships"."permissions" IS NULL OR "business_memberships"."permissions" <@ ARRAY['business:manage','dashboard:read','branch:read','branch:manage','team:manage','product:manage','inventory:read','inventory:manage','purchasing:read','purchasing:manage','pos:operate','sales:read','credit:manage','report:read','audit:read']::text[]);
