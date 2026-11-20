CREATE TYPE "public"."ps_delivery_method" AS ENUM('DELIVERY', 'PICKUP');--> statement-breakpoint
CREATE TYPE "public"."ps_fulfilment_status" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED_DELIVERY', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."ps_movement_type" AS ENUM('ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RESERVE', 'RELEASE', 'FULFIL', 'IMPORT', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."ps_payment_method" AS ENUM('CARD', 'BANK_TRANSFER', 'USSD', 'CASH_ON_DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."ps_payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."ps_payment_timing" AS ENUM('BEFORE_DELIVERY', 'ON_DELIVERY', 'PARTIAL');--> statement-breakpoint
CREATE TYPE "public"."ps_product_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "ps_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_cart_items_quantity_ck" CHECK ("ps_cart_items"."quantity" > 0 AND "ps_cart_items"."quantity" <= 999)
);
--> statement-breakpoint
CREATE TABLE "ps_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"external_id" text,
	"authorization_status" text DEFAULT 'NOT_CONNECTED' NOT NULL,
	"permissions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"credential_ref" text,
	"token_expires_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_connected_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_account_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"scopes" text[],
	"token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"channel_id" uuid,
	"customer_id" uuid,
	"external_thread_id" text,
	"subject" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text,
	"city" text,
	"state" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_delivery_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fee" bigint DEFAULT 0 NOT NULL,
	"estimated_days" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_delivery_zones_fee_ck" CHECK ("ps_delivery_zones"."fee" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ps_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_inventory_nonnegative_ck" CHECK ("ps_inventory"."quantity_on_hand" >= 0 AND "ps_inventory"."reserved" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ps_inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"quantity_before" integer NOT NULL,
	"quantity_after" integer NOT NULL,
	"movement_type" "ps_movement_type" NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" uuid,
	"actor_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_inventory_movements_quantity_ck" CHECK ("ps_inventory_movements"."quantity" <> 0 AND "ps_inventory_movements"."quantity_after" = "ps_inventory_movements"."quantity_before" + "ps_inventory_movements"."quantity" AND "ps_inventory_movements"."quantity_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ps_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"body" text NOT NULL,
	"external_message_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_messages_direction_ck" CHECK ("ps_messages"."direction" IN ('INBOUND','OUTBOUND'))
);
--> statement-breakpoint
CREATE TABLE "ps_order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"actor" text NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"variant_name" text NOT NULL,
	"sku" text NOT NULL,
	"image_url" text,
	"quantity" integer NOT NULL,
	"unit_price" bigint NOT NULL,
	"line_total" bigint NOT NULL,
	CONSTRAINT "ps_order_items_values_ck" CHECK ("ps_order_items"."quantity" > 0 AND "ps_order_items"."unit_price" >= 0 AND "ps_order_items"."line_total" = "ps_order_items"."quantity" * "ps_order_items"."unit_price")
);
--> statement-breakpoint
CREATE TABLE "ps_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"customer_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"delivery_method" "ps_delivery_method" NOT NULL,
	"delivery_zone_id" uuid,
	"address" text,
	"city" text,
	"state" text,
	"delivery_instructions" text,
	"subtotal" bigint NOT NULL,
	"delivery_fee" bigint DEFAULT 0 NOT NULL,
	"discount" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"deposit_amount" bigint DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"payment_method" "ps_payment_method" NOT NULL,
	"payment_timing" "ps_payment_timing" NOT NULL,
	"payment_status" "ps_payment_status" DEFAULT 'PENDING' NOT NULL,
	"fulfilment_status" "ps_fulfilment_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"tracking_ref" text,
	"internal_notes" text,
	"access_token_hash" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"reserved_until" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_orders_totals_ck" CHECK ("ps_orders"."subtotal" >= 0 AND "ps_orders"."delivery_fee" >= 0 AND "ps_orders"."discount" >= 0 AND "ps_orders"."total" = "ps_orders"."subtotal" + "ps_orders"."delivery_fee" - "ps_orders"."discount" AND "ps_orders"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ps_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"method" "ps_payment_method" NOT NULL,
	"provider_reference" text,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" "ps_payment_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_payments_amount_ck" CHECK ("ps_payments"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ps_product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"description" text,
	"price" bigint NOT NULL,
	"compare_at_price" bigint,
	"status" "ps_product_status" DEFAULT 'DRAFT' NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"weight_grams" integer,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_products_slug_ck" CHECK ("ps_products"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length("ps_products"."slug") <= 80),
	CONSTRAINT "ps_products_prices_ck" CHECK ("ps_products"."price" >= 0 AND ("ps_products"."compare_at_price" IS NULL OR "ps_products"."compare_at_price" >= "ps_products"."price")),
	CONSTRAINT "ps_products_threshold_ck" CHECK ("ps_products"."low_stock_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ps_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ps_store_settings" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"payment_methods" text[] DEFAULT ARRAY['CASH_ON_DELIVERY']::text[] NOT NULL,
	"payment_timing" "ps_payment_timing" DEFAULT 'ON_DELIVERY' NOT NULL,
	"deposit_percent" integer DEFAULT 0 NOT NULL,
	"delivery_enabled" boolean DEFAULT true NOT NULL,
	"pickup_enabled" boolean DEFAULT true NOT NULL,
	"cod_enabled" boolean DEFAULT true NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"delivery_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_settings_deposit_ck" CHECK ("ps_store_settings"."deposit_percent" >= 0 AND "ps_store_settings"."deposit_percent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "ps_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo_url" text,
	"banner_url" text,
	"category" text,
	"phone" text,
	"email" text,
	"whatsapp" text,
	"address" text,
	"state" text,
	"city" text,
	"country" text,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"opening_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_stores_slug_ck" CHECK ("ps_stores"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length("ps_stores"."slug") <= 60),
	CONSTRAINT "ps_stores_currency_ck" CHECK (char_length("ps_stores"."currency") = 3 AND "ps_stores"."currency" = upper("ps_stores"."currency"))
);
--> statement-breakpoint
CREATE TABLE "ps_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"sku" text NOT NULL,
	"price" bigint,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_variants_price_ck" CHECK ("ps_variants"."price" IS NULL OR "ps_variants"."price" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ps_assets_path_uq" ON "ps_assets" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "ps_assets_store_created_idx" ON "ps_assets" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_cart_items_cart_variant_uq" ON "ps_cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_carts_store_token_uq" ON "ps_carts" USING btree ("store_id","token");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_categories_store_name_uq" ON "ps_categories" USING btree ("store_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_categories_business_id_uq" ON "ps_categories" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_channels_store_provider_external_uq" ON "ps_channels" USING btree ("store_id","provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_connected_accounts_store_provider_uq" ON "ps_connected_accounts" USING btree ("store_id","provider","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_conversations_channel_thread_uq" ON "ps_conversations" USING btree ("channel_id","external_thread_id") WHERE "ps_conversations"."external_thread_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ps_conversations_store_updated_idx" ON "ps_conversations" USING btree ("store_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_customers_store_phone_uq" ON "ps_customers" USING btree ("store_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_customers_business_id_uq" ON "ps_customers" USING btree ("business_id","id");--> statement-breakpoint
CREATE INDEX "ps_customers_store_name_idx" ON "ps_customers" USING btree ("store_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_delivery_zones_store_name_uq" ON "ps_delivery_zones" USING btree ("store_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_inventory_variant_uq" ON "ps_inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "ps_inventory_store_idx" ON "ps_inventory" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "ps_inventory_movements_variant_created_idx" ON "ps_inventory_movements" USING btree ("variant_id","created_at");--> statement-breakpoint
CREATE INDEX "ps_inventory_movements_store_created_idx" ON "ps_inventory_movements" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_messages_external_uq" ON "ps_messages" USING btree ("store_id","external_message_id") WHERE "ps_messages"."external_message_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ps_messages_conversation_sent_idx" ON "ps_messages" USING btree ("conversation_id","sent_at");--> statement-breakpoint
CREATE INDEX "ps_order_events_order_created_idx" ON "ps_order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "ps_order_items_order_idx" ON "ps_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_orders_reference_uq" ON "ps_orders" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_orders_access_token_uq" ON "ps_orders" USING btree ("access_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_orders_idempotency_uq" ON "ps_orders" USING btree ("store_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "ps_orders_store_created_idx" ON "ps_orders" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "ps_orders_store_status_idx" ON "ps_orders" USING btree ("store_id","fulfilment_status");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_payments_provider_reference_uq" ON "ps_payments" USING btree ("provider","provider_reference") WHERE "ps_payments"."provider_reference" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ps_payments_order_idx" ON "ps_payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_product_images_product_asset_uq" ON "ps_product_images" USING btree ("product_id","asset_id");--> statement-breakpoint
CREATE INDEX "ps_product_images_product_position_idx" ON "ps_product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_products_store_sku_uq" ON "ps_products" USING btree ("store_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_products_store_slug_uq" ON "ps_products" USING btree ("store_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_products_business_id_uq" ON "ps_products" USING btree ("business_id","id");--> statement-breakpoint
CREATE INDEX "ps_products_store_status_idx" ON "ps_products" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_stores_business_uq" ON "ps_stores" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_stores_business_id_uq" ON "ps_stores" USING btree ("business_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_stores_slug_uq" ON "ps_stores" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ps_variants_product_sku_uq" ON "ps_variants" USING btree ("product_id","sku");--> statement-breakpoint
CREATE INDEX "ps_variants_product_idx" ON "ps_variants" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "ps_assets" ADD CONSTRAINT "ps_assets_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_assets" ADD CONSTRAINT "ps_assets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_assets" ADD CONSTRAINT "ps_assets_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_cart_items" ADD CONSTRAINT "ps_cart_items_cart_id_ps_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."ps_carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_cart_items" ADD CONSTRAINT "ps_cart_items_variant_id_ps_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."ps_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_carts" ADD CONSTRAINT "ps_carts_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_categories" ADD CONSTRAINT "ps_categories_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_categories" ADD CONSTRAINT "ps_categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_categories" ADD CONSTRAINT "ps_categories_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_channels" ADD CONSTRAINT "ps_channels_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_channels" ADD CONSTRAINT "ps_channels_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_channels" ADD CONSTRAINT "ps_channels_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_connected_accounts" ADD CONSTRAINT "ps_connected_accounts_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_connected_accounts" ADD CONSTRAINT "ps_connected_accounts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_connected_accounts" ADD CONSTRAINT "ps_connected_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_conversations" ADD CONSTRAINT "ps_conversations_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_conversations" ADD CONSTRAINT "ps_conversations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_conversations" ADD CONSTRAINT "ps_conversations_channel_id_ps_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."ps_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_conversations" ADD CONSTRAINT "ps_conversations_customer_id_ps_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."ps_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_conversations" ADD CONSTRAINT "ps_conversations_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_customers" ADD CONSTRAINT "ps_customers_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_customers" ADD CONSTRAINT "ps_customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_customers" ADD CONSTRAINT "ps_customers_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_delivery_zones" ADD CONSTRAINT "ps_delivery_zones_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_delivery_zones" ADD CONSTRAINT "ps_delivery_zones_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_delivery_zones" ADD CONSTRAINT "ps_zones_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory" ADD CONSTRAINT "ps_inventory_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory" ADD CONSTRAINT "ps_inventory_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory" ADD CONSTRAINT "ps_inventory_product_id_ps_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."ps_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory" ADD CONSTRAINT "ps_inventory_variant_id_ps_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."ps_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory" ADD CONSTRAINT "ps_inventory_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory" ADD CONSTRAINT "ps_inventory_tenant_product_fk" FOREIGN KEY ("business_id","product_id") REFERENCES "public"."ps_products"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory_movements" ADD CONSTRAINT "ps_inventory_movements_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory_movements" ADD CONSTRAINT "ps_inventory_movements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory_movements" ADD CONSTRAINT "ps_inventory_movements_product_id_ps_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."ps_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory_movements" ADD CONSTRAINT "ps_inventory_movements_variant_id_ps_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."ps_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory_movements" ADD CONSTRAINT "ps_inventory_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_inventory_movements" ADD CONSTRAINT "ps_movements_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_messages" ADD CONSTRAINT "ps_messages_conversation_id_ps_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ps_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_messages" ADD CONSTRAINT "ps_messages_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_order_events" ADD CONSTRAINT "ps_order_events_order_id_ps_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."ps_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_order_events" ADD CONSTRAINT "ps_order_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_order_items" ADD CONSTRAINT "ps_order_items_order_id_ps_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."ps_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_order_items" ADD CONSTRAINT "ps_order_items_product_id_ps_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."ps_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_order_items" ADD CONSTRAINT "ps_order_items_variant_id_ps_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."ps_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_orders" ADD CONSTRAINT "ps_orders_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_orders" ADD CONSTRAINT "ps_orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_orders" ADD CONSTRAINT "ps_orders_customer_id_ps_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."ps_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_orders" ADD CONSTRAINT "ps_orders_delivery_zone_id_ps_delivery_zones_id_fk" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."ps_delivery_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_orders" ADD CONSTRAINT "ps_orders_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_orders" ADD CONSTRAINT "ps_orders_tenant_customer_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "public"."ps_customers"("business_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_payments" ADD CONSTRAINT "ps_payments_order_id_ps_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."ps_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_payments" ADD CONSTRAINT "ps_payments_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_product_images" ADD CONSTRAINT "ps_product_images_product_id_ps_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."ps_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_product_images" ADD CONSTRAINT "ps_product_images_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_product_images" ADD CONSTRAINT "ps_product_images_asset_id_ps_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."ps_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_products" ADD CONSTRAINT "ps_products_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_products" ADD CONSTRAINT "ps_products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_products" ADD CONSTRAINT "ps_products_category_id_ps_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ps_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_products" ADD CONSTRAINT "ps_products_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_products" ADD CONSTRAINT "ps_products_tenant_category_fk" FOREIGN KEY ("business_id","category_id") REFERENCES "public"."ps_categories"("business_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_store_settings" ADD CONSTRAINT "ps_store_settings_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_store_settings" ADD CONSTRAINT "ps_store_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_store_settings" ADD CONSTRAINT "ps_settings_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_stores" ADD CONSTRAINT "ps_stores_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_stores" ADD CONSTRAINT "ps_stores_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_variants" ADD CONSTRAINT "ps_variants_product_id_ps_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."ps_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_variants" ADD CONSTRAINT "ps_variants_store_id_ps_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."ps_stores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_variants" ADD CONSTRAINT "ps_variants_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ps_variants" ADD CONSTRAINT "ps_variants_tenant_store_fk" FOREIGN KEY ("business_id","store_id") REFERENCES "public"."ps_stores"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
