# Website assets

## Retail brand photography

The September 2026 marketing redesign uses four user-supplied generated images.
They are brand illustrations, not customer testimonials or screenshots of the shipped software.
The POS hardware image is labelled as a checkout concept; it does not imply a hardware bundle.

- `public/brand/marketing/store-cashier.webp`: supplied image dated September 16, 11:11:13 PM.
- `public/brand/marketing/store-owner.webp`: supplied image dated September 16, 11:11:24 PM.
- `public/brand/marketing/inventory-team.webp`: supplied image dated September 16, 11:19:40 PM.
- `public/brand/marketing/pos-hardware.webp`: supplied image dated September 16, 11:22:24 PM.

WebP copies retain the original dimensions and use quality 84 (about 500 KB combined).
The homepage uses CSS cropping and shapes; no source-image content was altered.
The layout reference is https://moniepoint.com/ng/business: dark hero, photo collage,
overlapping industry panel, sticky product navigation, spacious product sections,
onboarding content, and a dark closing CTA. Copy, colors, imagery, and product claims
are customized for Retail Logic. No reference-site customer counts or testimonials are used.

## Product screenshots

Captured on 2026-09-13 from the actual running Retail Logic application and the existing Relay Market Group development/demo workspace. These are unaltered viewport captures (878 × 868); the data was already present in the workspace. No UI, chart, metric, product, or branch was drawn or substituted for these screenshots.

- `public/screenshots/overview.png`: `/overview?period=month`
- `public/screenshots/inventory.png`: `/inventory`
- `public/screenshots/branches.png`: `/branches`

The shared DashboardPreview component uses these files on the home, feature, and solution pages. Each image opens at its original size. Captions identify the demo workspace. Refresh by signing into the demo workspace, navigating to the relevant screen, waiting for its data to load, and saving a browser screenshot. Do not generate replacement product screenshots with AI or reproduce them in HTML.

## Decorative illustration

`public/brand/shopkeeper.png` was generated using the built-in imagegen tool. It is decorative and does not represent application functionality.

Final generation prompt:

Create a polished friendly flat editorial illustration asset for a retail software website. A cheerful Black woman shopkeeper with natural curly hair, wearing a brand emerald green #168b5b apron over a cream shirt and dark forest trousers, holding a small cardboard box on her left arm and waving with her right hand. Full body three quarter view, feet fully visible, expressive rounded organic shapes, simple dark ink line accents, tasteful modern friendly SaaS illustration style. Isolated single character centered on a truly transparent background, no backdrop, no text, no lettering, no logos, no interface, no dashboards, no graphs, no shadows extending far. Palette emerald green, mint, cream, warm brown skin and tiny pale peach accents. Portrait composition.
