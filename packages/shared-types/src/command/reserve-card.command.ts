import type { GameId } from "../common/game-id.js";
import type { IdempotencyKey } from "../common/idempotency-key.js";
import type { Version } from "../common/version.js";
import type { DeckTier } from "../state/board.state.js";

export interface ReserveCardCommand {
  type: "RESERVE_CARD";
  gameId: GameId;
  actorId: string;
  expectedVersion: Version;
  idempotencyKey: IdempotencyKey;
  payload: {
    cardId: string;
    tier: DeckTier;
    takeGoldToken: boolean;
  };
}
