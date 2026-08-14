ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_business_id_businesses_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_branch_id_branches_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "branch_assignments" DROP CONSTRAINT "branch_assignments_business_id_businesses_id_fk";
--> statement-breakpoint
ALTER TABLE "branch_assignments" DROP CONSTRAINT "branch_assignments_branch_id_branches_id_fk";
--> statement-breakpoint
ALTER TABLE "branch_assignments" DROP CONSTRAINT "branch_assignments_user_id_users_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "branches_business_id_uq" ON "branches" USING btree ("business_id","id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_branch_fk" FOREIGN KEY ("business_id","branch_id") REFERENCES "public"."branches"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_membership_fk" FOREIGN KEY ("business_id","user_id") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_assignments" ADD CONSTRAINT "branch_assignments_tenant_branch_fk" FOREIGN KEY ("business_id","branch_id") REFERENCES "public"."branches"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_assignments" ADD CONSTRAINT "branch_assignments_membership_fk" FOREIGN KEY ("business_id","user_id") REFERENCES "public"."business_memberships"("business_id","user_id") ON DELETE restrict ON UPDATE no action;
