type ErrorWithDetails = { code?: unknown; constraint?: unknown; constraint_name?: unknown; cause?: unknown };

function errorChain(error: unknown) {
  const chain: ErrorWithDetails[] = [];
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    chain.push(current as ErrorWithDetails);
    current = (current as ErrorWithDetails).cause;
  }
  return chain;
}

export function databaseErrorCode(error: unknown) {
  const match = errorChain(error).find((candidate) => typeof candidate.code === "string");
  return typeof match?.code === "string" ? match.code : undefined;
}

export function databaseConstraint(error: unknown) {
  const match = errorChain(error).find((candidate) => typeof candidate.constraint === "string" || typeof candidate.constraint_name === "string");
  if (typeof match?.constraint === "string") return match.constraint;
  return typeof match?.constraint_name === "string" ? match.constraint_name : undefined;
}

export function isDatabaseUnavailable(error: unknown) {
  return new Set(["CONNECT_TIMEOUT", "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", "CONNECTION_ENDED", "53300", "57P01", "57P02", "57P03"]).has(databaseErrorCode(error) ?? "");
}
