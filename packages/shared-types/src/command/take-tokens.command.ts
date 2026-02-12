import type { GameId } from "../common/game-id.js";
import type { IdempotencyKey } from "../common/idempotency-key.js";
import type { Version } from "../common/version.js";
import type { GemColor, TokenColor } from "../state/player.state.js";

export interface TakeTokensCommand {
  type: "TAKE_TOKENS";
  gameId: GameId;
  actorId: string;
  expectedVersion: Version;
  idempotencyKey: IdempotencyKey;
  payload: {
    tokens: Partial<Record<GemColor, number>>;
    returnedTokens?: Partial<Record<TokenColor, number>>;
  };
}
