import Image from "next/image";

const screens = {
  overview: { label: "Overview", description: "Retail Logic overview showing branch filters, net sales, average sale, gross profit, inventory value, and branch performance." },
  inventory: { label: "Inventory", description: "Retail Logic inventory showing actual branch-product balances, quantities, reorder levels, stock values, and stock actions." },
  branches: { label: "Branches", description: "Retail Logic branch management showing the Abuja Central, Ikeja, and Lekki locations." },
} as const;

/** Unaltered captures of the running application; see docs/marketing-assets.md. */
export function DashboardPreview({ compact = false, screen = "overview" }: { compact?: boolean; screen?: keyof typeof screens }) {
  const capture = screens[screen];
  return <figure className={`product-capture ${compact ? "compact" : ""}`}>
    <a className="product-capture-link" href={`/screenshots/${screen}.png`} target="_blank" rel="noopener noreferrer" aria-label={`View full-size ${capture.label} screenshot (opens in a new tab)`}>
      <Image src={`/screenshots/${screen}.png`} width={878} height={868} alt={capture.description} sizes="(max-width: 680px) 100vw, (max-width: 980px) 90vw, 700px" />
    </a>
    <figcaption>{capture.label} <span>Retail Logic · Demo workspace</span></figcaption>
  </figure>;
}
