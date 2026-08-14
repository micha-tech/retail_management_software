CREATE TYPE "public"."inventory_count_status" AS ENUM('DRAFT', 'COUNTING', 'REVIEW', 'POSTED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "inventory_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"count_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"expected_quantity" integer NOT NULL,
	"counted_quantity" integer,
	"variance_quantity" integer,
	"posting_quantity_before" integer,
	"posted_adjustment" integer,
	"notes" text,
	"counted_by" uuid,
	"counted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_count_items_quantities_ck" CHECK ("inventory_count_items"."expected_quantity" >= 0 AND ("inventory_count_items"."counted_quantity" IS NULL OR "inventory_count_items"."counted_quantity" >= 0) AND (("inventory_count_items"."counted_quantity" IS NULL AND "inventory_count_items"."variance_quantity" IS NULL) OR ("inventory_count_items"."counted_quantity" IS NOT NULL AND "inventory_count_items"."variance_quantity" = "inventory_count_items"."counted_quantity" - "inventory_count_items"."expected_quantity")) AND (("inventory_count_items"."posting_quantity_before" IS NULL AND "inventory_count_items"."posted_adjustment" IS NULL) OR ("inventory_count_items"."counted_quantity" IS NOT NULL AND "inventory_count_items"."posting_quantity_before" >= 0 AND "inventory_count_items"."posted_adjustment" = "inventory_count_items"."counted_quantity" - "inventory_count_items"."posting_quantity_before")))
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"count_number" text NOT NULL,
	"status" "inventory_count_status" DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"started_by" uuid,
	"reviewed_by" uuid,
	"posted_by" uuid,
	"started_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"posted_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_counts_business_branch_id_uq" ON "inventory_counts" USING btree ("business_id","branch_id","id");--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_counted_by_users_id_fk" FOREIGN KEY ("counted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_tenant_count_fk" FOREIGN KEY ("business_id","branch_id","count_id") REFERENCES "public"."inventory_counts"("business_id","branch_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_tenant_product_fk" FOREIGN KEY ("business_id","product_id") REFERENCES "public"."products"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_tenant_branch_fk" FOREIGN KEY ("business_id","branch_id") REFERENCES "public"."branches"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_creator_membership_fk" FOREIGN KEY ("business_id","created_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_count_items_count_product_uq" ON "inventory_count_items" USING btree ("count_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_count_items_business_branch_idx" ON "inventory_count_items" USING btree ("business_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_counts_business_number_uq" ON "inventory_counts" USING btree ("business_id","count_number");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_counts_branch_open_uq" ON "inventory_counts" USING btree ("branch_id") WHERE "inventory_counts"."status" in ('DRAFT','COUNTING','REVIEW');--> statement-breakpoint
CREATE INDEX "inventory_counts_business_branch_created_idx" ON "inventory_counts" USING btree ("business_id","branch_id","created_at");--> statement-breakpoint
CREATE FUNCTION prevent_terminal_inventory_count_change() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.status IN ('POSTED', 'CANCELLED') THEN
    RAISE EXCEPTION 'terminal inventory counts are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
CREATE TRIGGER inventory_counts_terminal_immutable
BEFORE UPDATE OR DELETE ON inventory_counts
FOR EACH ROW EXECUTE FUNCTION prevent_terminal_inventory_count_change();--> statement-breakpoint
CREATE FUNCTION prevent_terminal_inventory_count_item_change() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_count_id uuid;
BEGIN
  target_count_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.count_id ELSE OLD.count_id END;
  IF EXISTS (SELECT 1 FROM public.inventory_counts WHERE id = target_count_id AND status IN ('POSTED', 'CANCELLED')) THEN
    RAISE EXCEPTION 'items belonging to a terminal inventory count are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;--> statement-breakpoint
CREATE TRIGGER inventory_count_items_terminal_immutable
BEFORE INSERT OR UPDATE OR DELETE ON inventory_count_items
FOR EACH ROW EXECUTE FUNCTION prevent_terminal_inventory_count_item_change();
