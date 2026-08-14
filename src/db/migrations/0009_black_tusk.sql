CREATE TYPE "public"."billing_interval" AS ENUM('MONTHLY', 'ANNUAL', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED');--> statement-breakpoint
CREATE TABLE "business_subscriptions" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"plan_code" text DEFAULT 'trial' NOT NULL,
	"status" "subscription_status" DEFAULT 'TRIALING' NOT NULL,
	"billing_interval" "billing_interval" DEFAULT 'MONTHLY' NOT NULL,
	"amount" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_starts_at" timestamp with time zone,
	"current_period_ends_at" timestamp with time zone,
	"grace_period_ends_at" timestamp with time zone,
	"branch_limit" integer,
	"employee_limit" integer,
	"provider" text,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"notes" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_plan_code_ck" CHECK ("business_subscriptions"."plan_code" = lower(trim("business_subscriptions"."plan_code")) AND "business_subscriptions"."plan_code" ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
	CONSTRAINT "subscriptions_amount_nonnegative_ck" CHECK ("business_subscriptions"."amount" >= 0),
	CONSTRAINT "subscriptions_currency_code_ck" CHECK (char_length("business_subscriptions"."currency") = 3 AND "business_subscriptions"."currency" = upper("business_subscriptions"."currency")),
	CONSTRAINT "subscriptions_limits_positive_ck" CHECK (("business_subscriptions"."branch_limit" IS NULL OR "business_subscriptions"."branch_limit" > 0) AND ("business_subscriptions"."employee_limit" IS NULL OR "business_subscriptions"."employee_limit" > 0))
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_status_period_idx" ON "business_subscriptions" USING btree ("status","current_period_ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_subscription_uq" ON "business_subscriptions" USING btree ("provider","provider_subscription_id") WHERE "business_subscriptions"."provider_subscription_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "subscription_events_business_created_idx" ON "subscription_events" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "subscription_events_actor_created_idx" ON "subscription_events" USING btree ("actor_user_id","created_at");
--> statement-breakpoint
INSERT INTO "business_subscriptions" ("business_id","plan_code","status","billing_interval","amount","currency","current_period_starts_at")
SELECT "id",'legacy','ACTIVE','MANUAL',0,"currency","created_at" FROM "businesses"
ON CONFLICT ("business_id") DO NOTHING;
--> statement-breakpoint
CREATE TRIGGER subscription_events_immutable
BEFORE UPDATE OR DELETE ON subscription_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
