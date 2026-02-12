import type {
  BuyCardCommand,
  EndTurnCommand,
  ReserveCardCommand,
  TakeTokensCommand,
} from "@repo/shared-types";

interface BaseCommandOverrides {
  gameId?: string;
  actorId?: string;
  expectedVersion?: number;
  idempotencyKey?: string;
}

const DEFAULT_GAME_ID = "game-fixture";
const DEFAULT_ACTOR_ID = "player-1";

export function buildTakeTokensCommand(
  payload: TakeTokensCommand["payload"],
  overrides: BaseCommandOverrides = {},
): TakeTokensCommand {
  return {
    type: "TAKE_TOKENS",
    gameId: overrides.gameId ?? DEFAULT_GAME_ID,
    actorId: overrides.actorId ?? DEFAULT_ACTOR_ID,
    expectedVersion: overrides.expectedVersion ?? 1,
    idempotencyKey:
      overrides.idempotencyKey ?? makeIdempotencyKey("take", payload.tokens),
    payload,
  };
}

export function buildReserveCardCommand(
  payload: ReserveCardCommand["payload"],
  overrides: BaseCommandOverrides = {},
): ReserveCardCommand {
  return {
    type: "RESERVE_CARD",
    gameId: overrides.gameId ?? DEFAULT_GAME_ID,
    actorId: overrides.actorId ?? DEFAULT_ACTOR_ID,
    expectedVersion: overrides.expectedVersion ?? 1,
    idempotencyKey:
      overrides.idempotencyKey ?? makeIdempotencyKey("reserve", payload.target),
    payload,
  };
}

export function buildBuyCardCommand(
  payload: BuyCardCommand["payload"],
  overrides: BaseCommandOverrides = {},
): BuyCardCommand {
  return {
    type: "BUY_CARD",
    gameId: overrides.gameId ?? DEFAULT_GAME_ID,
    actorId: overrides.actorId ?? DEFAULT_ACTOR_ID,
    expectedVersion: overrides.expectedVersion ?? 1,
    idempotencyKey:
      overrides.idempotencyKey ?? makeIdempotencyKey("buy", payload.source),
    payload,
  };
}

export function buildEndTurnCommand(
  payload: EndTurnCommand["payload"] = { reason: "ACTION_COMPLETED" },
  overrides: BaseCommandOverrides = {},
): EndTurnCommand {
  return {
    type: "END_TURN",
    gameId: overrides.gameId ?? DEFAULT_GAME_ID,
    actorId: overrides.actorId ?? DEFAULT_ACTOR_ID,
    expectedVersion: overrides.expectedVersion ?? 1,
    idempotencyKey:
      overrides.idempotencyKey ?? makeIdempotencyKey("end-turn", payload.reason),
    payload,
  };
}

function makeIdempotencyKey(prefix: string, payload: unknown): string {
  return `${prefix}:${JSON.stringify(payload)}`;
}
