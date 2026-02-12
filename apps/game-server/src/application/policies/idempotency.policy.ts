export type IdempotencyDecision =
  | "accept"
  | "reject_duplicate"
  | "reject_missing";

export function evaluateIdempotencyKey(
  seenKeys: ReadonlySet<string>,
  idempotencyKey: string | null | undefined,
): IdempotencyDecision {
  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.trim().length === 0
  ) {
    return "reject_missing";
  }

  if (seenKeys.has(idempotencyKey)) {
    return "reject_duplicate";
  }

  return "accept";
}
