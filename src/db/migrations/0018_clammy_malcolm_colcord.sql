ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_values_ck";--> statement-breakpoint
ALTER TABLE "branch_inventory" ALTER COLUMN "quantity_on_hand" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "branch_inventory" ALTER COLUMN "reorder_level" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "expected_quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "counted_quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "variance_quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "posting_quantity_before" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "posted_adjustment" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "minimum_stock_level" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "purchase_order_items" ALTER COLUMN "ordered_quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "purchase_order_items" ALTER COLUMN "received_quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "sale_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "quantity_before" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "quantity_after" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "stock_receipt_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(14, 3);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "allow_fractional_quantity" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_values_ck" CHECK ("sale_items"."quantity" > 0 AND "sale_items"."unit_price" >= 0 AND "sale_items"."cost_price_snapshot" >= 0 AND "sale_items"."discount" >= 0 AND "sale_items"."line_total" = round("sale_items"."quantity" * "sale_items"."unit_price") - "sale_items"."discount" AND "sale_items"."line_total" >= 0);
