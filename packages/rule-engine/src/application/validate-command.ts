export type CommandEnvelope = {
  type: string;
  actorId: string;
  expectedVersion: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

export type CommandValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateCommandEnvelope(
  input: Partial<CommandEnvelope>,
): CommandValidationResult {
  if (typeof input.type !== "string" || input.type.trim().length === 0) {
    return { ok: false, reason: "INVALID_TYPE" };
  }

  if (typeof input.actorId !== "string" || input.actorId.trim().length === 0) {
    return { ok: false, reason: "INVALID_ACTOR_ID" };
  }

  if (
    typeof input.expectedVersion !== "number" ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 0
  ) {
    return { ok: false, reason: "INVALID_EXPECTED_VERSION" };
  }

  if (
    typeof input.idempotencyKey !== "string" ||
    input.idempotencyKey.trim().length === 0
  ) {
    return { ok: false, reason: "INVALID_IDEMPOTENCY_KEY" };
  }

  if (
    typeof input.payload !== "object" ||
    input.payload === null ||
    Array.isArray(input.payload)
  ) {
    return { ok: false, reason: "INVALID_PAYLOAD" };
  }

  return { ok: true };
}
