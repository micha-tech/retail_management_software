ALTER TABLE "purchase_order_payments" DROP CONSTRAINT "purchase_order_payments_purchase_order_id_purchase_orders_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_business_id_uq" ON "purchase_orders" USING btree ("business_id","id");--> statement-breakpoint
ALTER TABLE "purchase_order_payments" ADD CONSTRAINT "purchase_order_payments_tenant_order_fk" FOREIGN KEY ("business_id","purchase_order_id") REFERENCES "public"."purchase_orders"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_receipts" ADD CONSTRAINT "stock_receipts_tenant_order_fk" FOREIGN KEY ("business_id","purchase_order_id") REFERENCES "public"."purchase_orders"("business_id","id") ON DELETE restrict ON UPDATE no action;
