"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ApplicationError } from "@/lib/errors";
import { withToast } from "@/lib/toast";
import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";
import { buildImportEntries, importProducts, readProductFile } from "./product-import";

export async function importProductsFileAction(formData: FormData) {
  const access = await requirePermission("product:manage");
  const branchId = z.union([z.uuid(), z.literal("all")]).parse(formData.get("branchId") || "all");
  try {
    const accessible = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
    if (!accessible.length) throw new ApplicationError("There are no branches available to receive opening stock.", "NO_BRANCHES");
    const targetBranches = branchId === "all" ? accessible : accessible.filter((branch) => branch.id === branchId);
    const rows = await readProductFile(formData.get("file") as File);
    const entries = buildImportEntries(rows);
    const result = await importProducts({ businessId: access.business.id, userId: access.user.id, branches: targetBranches, entries });
    revalidatePath("/products");
    revalidatePath("/inventory");
    let message = `${result.created} product${result.created === 1 ? "" : "s"} imported${result.skipped ? `, ${result.skipped} skipped` : ""}.`;
    if (result.created === 0) message = "No products were imported. Ensure the file has valid rows.";
    redirect(withToast("/products", message));
  } catch (error) {
    const message = error instanceof ApplicationError ? error.message : "Product import failed.";
    redirect(`/products/import?error=${encodeURIComponent(message)}`);
  }
}
