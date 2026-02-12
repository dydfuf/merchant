import type { GameId } from "../common/game-id.js";
import type { IdempotencyKey } from "../common/idempotency-key.js";
import type { Version } from "../common/version.js";

export type EndTurnReason = "ACTION_COMPLETED" | "MANUAL" | "RECOVERY";

export interface EndTurnCommand {
  type: "END_TURN";
  gameId: GameId;
  actorId: string;
  expectedVersion: Version;
  idempotencyKey: IdempotencyKey;
  payload: {
    reason: EndTurnReason;
  };
}
