"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApplicationError } from "@/lib/errors";
import { withToast } from "@/lib/toast";
import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";
import { buildOpeningStockRows, importOpeningStock, readOpeningStockFile } from "./opening-stock-import";

export async function importOpeningStockFileAction(formData: FormData) {
  const access = await requirePermission("inventory:manage");
  try {
    const branches = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role }).then((bs) => bs.map((b) => ({ id: b.id, code: b.code, name: b.name })));
    if (!branches.length) throw new ApplicationError("There are no branches available. Create a branch before importing opening stock.", "NO_BRANCHES");
    const rows = await readOpeningStockFile(formData.get("file") as File);
    const parsed = buildOpeningStockRows(rows);
    const result = await importOpeningStock({ businessId: access.business.id, userId: access.user.id, branches, rows: parsed });
    revalidatePath("/inventory");
    revalidatePath("/products");
    const parts = [`${result.created} product${result.created === 1 ? "" : "s"} created`, `${result.updated} price${result.updated === 1 ? "" : "s"} updated`, `${result.balances} stock balance${result.balances === 1 ? "" : "s"} set`];
    const message = `${parts.join(", ")}.${result.skipped ? ` ${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped.` : ""}`;
    redirect(withToast("/inventory/opening-stock", message));
  } catch (error) {
    const message = error instanceof ApplicationError ? error.message : "Opening stock import failed.";
    redirect(`/inventory/opening-stock?error=${encodeURIComponent(message)}`);
  }
}