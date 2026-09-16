export type ProcurementRecommendation = {
  targetQuantity: number;
  inventoryPosition: number;
  suggestedQuantity: number;
  explanation: string;
};

export function recommendPurchaseQuantity(input: { averageDailySales: number; onHand: number; incomingQuantity: number; targetCoverageDays?: number }): ProcurementRecommendation {
  const targetCoverageDays = input.targetCoverageDays ?? 14;
  if (!Number.isFinite(input.averageDailySales) || input.averageDailySales < 0 || !Number.isInteger(input.onHand) || input.onHand < 0 || !Number.isInteger(input.incomingQuantity) || input.incomingQuantity < 0 || !Number.isInteger(targetCoverageDays) || targetCoverageDays <= 0) {
    throw new Error("Procurement recommendation inputs are invalid.");
  }
  const targetQuantity = Math.ceil(input.averageDailySales * targetCoverageDays);
  const inventoryPosition = input.onHand + input.incomingQuantity;
  const suggestedQuantity = Math.max(0, targetQuantity - inventoryPosition);
  return {
    targetQuantity,
    inventoryPosition,
    suggestedQuantity,
    explanation: `Targets ${targetCoverageDays} days of recent average demand (${input.averageDailySales.toFixed(1)} units/day), less current stock and open purchase-order quantity.`,
  };
}
