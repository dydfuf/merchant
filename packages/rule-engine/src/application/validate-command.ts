type DeckTier = 1 | 2 | 3;

const END_TURN_REASONS = new Set([
  "ACTION_COMPLETED",
  "MANUAL",
  "RECOVERY",
]);

export type CommandEnvelope = {
  type: string;
  actorId: string;
  expectedVersion: number;
  idempotencyKey: string;
  payload: unknown;
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
    !isRecord(input.payload)
  ) {
    return { ok: false, reason: "INVALID_PAYLOAD" };
  }

  return validateCommandPayloadByType(input.type, input.payload);
}

function validateCommandPayloadByType(
  commandType: string,
  payload: Record<string, unknown>,
): CommandValidationResult {
  switch (commandType) {
    case "TAKE_TOKENS":
      return validateTakeTokensPayload(payload);
    case "RESERVE_CARD":
      return validateReserveCardPayload(payload);
    case "BUY_CARD":
      return validateBuyCardPayload(payload);
    case "END_TURN":
      return validateEndTurnPayload(payload);
    default:
      return { ok: false, reason: "INVALID_TYPE" };
  }
}

function validateTakeTokensPayload(
  payload: Record<string, unknown>,
): CommandValidationResult {
  if (!isRecord(payload.tokens)) {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_TAKE_TOKENS",
    };
  }

  if (
    payload.returnedTokens !== undefined &&
    !isRecord(payload.returnedTokens)
  ) {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_TAKE_TOKENS",
    };
  }

  return { ok: true };
}

function validateReserveCardPayload(
  payload: Record<string, unknown>,
): CommandValidationResult {
  if (!isRecord(payload.target)) {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_RESERVE_CARD",
    };
  }

  if (typeof payload.takeGoldToken !== "boolean") {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_RESERVE_CARD",
    };
  }

  if (
    payload.returnedTokens !== undefined &&
    !isRecord(payload.returnedTokens)
  ) {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_RESERVE_CARD",
    };
  }

  const target = payload.target;
  if (target.kind === "OPEN_CARD") {
    if (
      !isNonEmptyString(target.cardId) ||
      !isDeckTier(target.tier)
    ) {
      return {
        ok: false,
        reason: "INVALID_PAYLOAD_RESERVE_CARD",
      };
    }

    return { ok: true };
  }

  if (target.kind === "DECK_TOP") {
    if (!isDeckTier(target.tier)) {
      return {
        ok: false,
        reason: "INVALID_PAYLOAD_RESERVE_CARD",
      };
    }

    return { ok: true };
  }

  return {
    ok: false,
    reason: "INVALID_PAYLOAD_RESERVE_CARD",
  };
}

function validateBuyCardPayload(
  payload: Record<string, unknown>,
): CommandValidationResult {
  if (
    !isRecord(payload.source) ||
    !isRecord(payload.payment)
  ) {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_BUY_CARD",
    };
  }

  const source = payload.source;
  if (
    !isNonEmptyString(source.cardId) ||
    (source.kind !== "OPEN_MARKET" && source.kind !== "RESERVED")
  ) {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_BUY_CARD",
    };
  }

  return { ok: true };
}

function validateEndTurnPayload(
  payload: Record<string, unknown>,
): CommandValidationResult {
  if (
    typeof payload.reason !== "string" ||
    !END_TURN_REASONS.has(payload.reason)
  ) {
    return {
      ok: false,
      reason: "INVALID_PAYLOAD_END_TURN",
    };
  }

  return { ok: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDeckTier(value: unknown): value is DeckTier {
  return value === 1 || value === 2 || value === 3;
}
