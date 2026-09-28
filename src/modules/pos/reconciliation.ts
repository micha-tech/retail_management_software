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
