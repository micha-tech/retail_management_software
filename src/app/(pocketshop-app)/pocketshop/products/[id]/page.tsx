import { notFound } from "next/navigation";

import { ProductEditor } from "@/components/pocketshop/product-editor";
import { PageHeader } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { getProductForEdit } from "@/modules/pocketshop/queries";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { store, business } = await requirePocketStore();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProductForEdit(store.id, business.id, id);
  if (!data) notFound();
  return (
    <>
      <PageHeader eyebrow="Catalogue" title={data.product.name} description="Update details, variants, images and stock." />
      <main className="ps-page narrow"><ProductEditor data={data} currency={store.currency} /></main>
    </>
  );
}
