import type { GameId } from "../common/game-id.js";
import type { IdempotencyKey } from "../common/idempotency-key.js";
import type { Version } from "../common/version.js";
import type { DeckTier } from "../state/board.state.js";
import type { TokenColor } from "../state/player.state.js";

export type ReserveCardTarget =
  | {
      kind: "OPEN_CARD";
      cardId: string;
      tier: DeckTier;
    }
  | {
      kind: "DECK_TOP";
      tier: DeckTier;
    };

export interface ReserveCardCommand {
  type: "RESERVE_CARD";
  gameId: GameId;
  actorId: string;
  expectedVersion: Version;
  idempotencyKey: IdempotencyKey;
  payload: {
    target: ReserveCardTarget;
    returnedTokens?: Partial<Record<TokenColor, number>>;
    takeGoldToken: boolean;
  };
}
