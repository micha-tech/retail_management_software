import { sql } from "drizzle-orm";

export function inventoryBranchLock(branchId: string) { return sql`select pg_advisory_xact_lock(hashtext(${branchId}))`; }
export function activeInventoryCount(branchId: string) { return sql`select id,count_number from inventory_counts where branch_id=${branchId} and status in ('COUNTING','REVIEW') limit 1`; }
