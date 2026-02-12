import type { GameId } from "../common/game-id.js";
import type { IdempotencyKey } from "../common/idempotency-key.js";
import type { Version } from "../common/version.js";
import type { TokenColor } from "../state/player.state.js";

export type BuyCardSource =
  | {
      kind: "OPEN_MARKET";
      cardId: string;
    }
  | {
      kind: "RESERVED";
      cardId: string;
    };

export interface BuyCardCommand {
  type: "BUY_CARD";
  gameId: GameId;
  actorId: string;
  expectedVersion: Version;
  idempotencyKey: IdempotencyKey;
  payload: {
    source: BuyCardSource;
    payment: Partial<Record<TokenColor, number>>;
  };
}
