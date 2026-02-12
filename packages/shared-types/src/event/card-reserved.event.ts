import type { GameId } from "../common/game-id.js";
import type { Version } from "../common/version.js";
import type { DeckTier } from "../state/board.state.js";

export interface CardReservedEvent {
  type: "CARD_RESERVED";
  gameId: GameId;
  actorId: string;
  version: Version;
  payload: {
    cardId: string;
    tier: DeckTier;
    grantedGold: boolean;
  };
}
