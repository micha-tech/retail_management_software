export const QUANTITY_SCALE = 1_000;
export const QUANTITY_MAX = 100_000;

export function isValidQuantity(value: number, { allowZero = false, max = QUANTITY_MAX }: { allowZero?: boolean; max?: number } = {}) {
  return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0) && value <= max && Math.abs(value * QUANTITY_SCALE - Math.round(value * QUANTITY_SCALE)) < 0.000_001;
}

export function normalizeQuantity(value: number) { return Math.round(value * QUANTITY_SCALE) / QUANTITY_SCALE; }

export function formatQuantity(value: number) { return normalizeQuantity(value).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1"); }

export function quantityToThousandths(value: number) {
  if (!isValidQuantity(value, { allowZero: true })) throw new Error("Invalid quantity");
  return BigInt(Math.round(value * QUANTITY_SCALE));
}
