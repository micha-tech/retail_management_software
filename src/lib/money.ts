const currencySymbols: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", GHS: "GH₵", EUR: "€" };

export function parseMoney(value: string): bigint {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Enter a valid non-negative amount with at most two decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function formatMoney(minorUnits: bigint, currency = "NGN") {
  const negative = minorUnits < 0n;
  const absolute = negative ? -minorUnits : minorUnits;
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${currencySymbols[currency] ?? `${currency} `}${whole}.${fraction}`;
}

export function calculateLineTotal(quantity: number, unitPrice: bigint, discount = 0n) {
  if (!Number.isInteger(quantity) || quantity <= 0 || unitPrice < 0n || discount < 0n) throw new Error("Invalid line values.");
  const total = BigInt(quantity) * unitPrice - discount;
  if (total < 0n) throw new Error("Discount cannot exceed the line value.");
  return total;
}

export function calculateSaleTotal(subtotal: bigint, discount = 0n, tax = 0n) {
  if (subtotal < 0n || discount < 0n || tax < 0n || discount > subtotal) throw new Error("Invalid sale totals.");
  return subtotal - discount + tax;
}

export function calculateGrossProfit(netSales: bigint, costOfGoods: bigint) { return netSales - costOfGoods; }
export function calculateCashDifference(actual: bigint, expected: bigint) { return actual - expected; }
