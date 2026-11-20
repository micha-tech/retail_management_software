import { asc, eq, and } from "drizzle-orm";

import { ProductEditor } from "@/components/pocketshop/product-editor";
import { PageHeader } from "@/components/pocketshop/ui";
import { db } from "@/db/client";
import { psCategories } from "@/db/schema";
import { requirePocketStore } from "@/modules/pocketshop/authorization";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { store, business } = await requirePocketStore();
  const categories = await db.select({ id: psCategories.id, name: psCategories.name })
    .from(psCategories).where(and(eq(psCategories.storeId, store.id), eq(psCategories.businessId, business.id))).orderBy(asc(psCategories.name));
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Add a product" description="Start with the essentials. You can add variants, images and stock now." />
      <main className="ps-page narrow"><ProductEditor data={{ product: null, categories, variants: [], images: [] }} currency={store.currency} /></main>
    </>
  );
}
