import Link from "next/link";

import { ImportCsvForm } from "@/components/pocketshop/import-csv-form";
import { PageHeader } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";

export const metadata = { title: "Import products" };

export default async function ImportProductsPage() {
  await requirePocketStore();
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Import products" description="Bring a catalogue in from CSV. Every row is checked before anything is created." actions={<Link className="ps-button secondary" href="/api/pocketshop/products/template">Download template</Link>} />
      <main className="ps-page narrow"><ImportCsvForm /></main>
    </>
  );
}
