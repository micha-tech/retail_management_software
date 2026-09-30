import { formatMoney } from "../../lib/money";

export type TillCashMovement = {
  type: "CASH_IN" | "CASH_OUT";
  amount: bigint;
};

export function calculateExpectedTillCash(
  openingCash: bigint,
  completedCashPayments: bigint,
  movements: TillCashMovement[],
) {
  return movements.reduce(
    (expected, movement) => expected + (movement.type === "CASH_IN" ? movement.amount : -movement.amount),
    openingCash + completedCashPayments,
  );
}

export function formatTillAmount(amount: bigint) {
  const whole = (amount / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${whole}.${(amount % 100n).toString().padStart(2, "0")}`;
}

export function cashReconciliationMessage(expectedCash: bigint, actualCash: bigint, currency: string, revealAmounts: boolean) {
  if (!revealAmounts) return "Expected cash and actual cash do not reconcile. Recount the drawer and verify the recorded cash movements.";
  const difference = actualCash - expectedCash;
  return `Till cannot be closed. Expected ${formatMoney(expectedCash, currency)}, entered ${formatMoney(actualCash, currency)}, difference ${formatMoney(difference, currency)}.`;
}
