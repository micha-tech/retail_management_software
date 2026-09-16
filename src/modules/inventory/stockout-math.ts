export type StockoutRisk = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NO_HISTORY";

export type StockoutAssessment = {
  risk: StockoutRisk;
  averageDailySales: number;
  daysOfCover: number | null;
  reason: string;
};

export function assessStockoutRisk(input: { onHand: number; trailingUnits: number; incomingQuantity: number; windowDays?: number }): StockoutAssessment {
  const windowDays = input.windowDays ?? 28;
  if (!Number.isInteger(input.onHand) || input.onHand < 0 || !Number.isInteger(input.trailingUnits) || input.trailingUnits < 0 || !Number.isInteger(input.incomingQuantity) || input.incomingQuantity < 0 || !Number.isInteger(windowDays) || windowDays <= 0) {
    throw new Error("Stockout inputs must be non-negative integers and a positive day window.");
  }

  const averageDailySales = input.trailingUnits / windowDays;
  if (averageDailySales === 0) {
    return { risk: "NO_HISTORY", averageDailySales, daysOfCover: null, reason: "No completed sales were recorded in the measurement window." };
  }

  const daysOfCover = input.onHand / averageDailySales;
  const incomingNote = input.incomingQuantity > 0 ? ` ${input.incomingQuantity} unit${input.incomingQuantity === 1 ? "" : "s"} are still expected on open purchase orders.` : " No open purchase-order quantity is recorded.";
  if (daysOfCover <= 1) return { risk: input.incomingQuantity > 0 ? "HIGH" : "CRITICAL", averageDailySales, daysOfCover, reason: `Current stock covers about ${daysOfCover.toFixed(1)} day${daysOfCover === 1 ? "" : "s"} of recent demand.${incomingNote}` };
  if (daysOfCover <= 3) return { risk: input.incomingQuantity > 0 ? "MEDIUM" : "HIGH", averageDailySales, daysOfCover, reason: `Current stock covers about ${daysOfCover.toFixed(1)} days of recent demand.${incomingNote}` };
  if (daysOfCover <= 7) return { risk: "MEDIUM", averageDailySales, daysOfCover, reason: `Current stock covers about ${daysOfCover.toFixed(1)} days of recent demand.${incomingNote}` };
  return { risk: "LOW", averageDailySales, daysOfCover, reason: `Current stock covers about ${daysOfCover.toFixed(1)} days of recent demand.${incomingNote}` };
}
