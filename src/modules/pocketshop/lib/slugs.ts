const RESERVED_SLUGS = new Set([
  "api", "app", "admin", "login", "logout", "register", "onboarding", "dashboard", "products",
  "product", "store", "stores", "pocketshop", "choose", "features", "solutions", "pricing",
  "about", "contact", "demo", "platform", "cart", "checkout", "order", "orders", "track",
  "settings", "health", "assets", "uploads", "payments", "help", "support", "www", "mail",
]);

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60 && !RESERVED_SLUGS.has(value);
}

export function normalizeSku(value: string): string {
  return value.trim().toUpperCase().slice(0, 64);
}
