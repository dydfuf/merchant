import type { GameId } from "../common/game-id.js";
import type { Version } from "../common/version.js";
import type { GemColor, TokenColor } from "../state/player.state.js";

export interface CardBoughtEvent {
  type: "CARD_BOUGHT";
  gameId: GameId;
  actorId: string;
  version: Version;
  payload: {
    cardId: string;
    spentTokens: Partial<Record<TokenColor, number>>;
    gainedBonusColor?: GemColor;
    scoreDelta: number;
  };
}
