CREATE TYPE "public"."operational_alert_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."operational_alert_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."operational_alert_type" AS ENUM('INVENTORY_VARIANCE');--> statement-breakpoint
CREATE TABLE "operational_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"type" "operational_alert_type" NOT NULL,
	"severity" "operational_alert_severity" NOT NULL,
	"status" "operational_alert_status" DEFAULT 'OPEN' NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"recommendation" text NOT NULL,
	"supporting_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"dismissed_by" uuid,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_dismissed_by_users_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_tenant_branch_fk" FOREIGN KEY ("business_id","branch_id") REFERENCES "public"."branches"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_creator_membership_fk" FOREIGN KEY ("business_id","created_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_acknowledger_membership_fk" FOREIGN KEY ("business_id","acknowledged_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_resolver_membership_fk" FOREIGN KEY ("business_id","resolved_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_dismisser_membership_fk" FOREIGN KEY ("business_id","dismissed_by") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "operational_alerts_business_type_entity_uq" ON "operational_alerts" USING btree ("business_id","type","entity_id");--> statement-breakpoint
CREATE INDEX "operational_alerts_business_status_created_idx" ON "operational_alerts" USING btree ("business_id","status","created_at");