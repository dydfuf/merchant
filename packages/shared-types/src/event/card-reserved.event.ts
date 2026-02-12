import type { GameId } from "../common/game-id.js";
import type { Version } from "../common/version.js";
import type { DeckTier } from "../state/board.state.js";

export type ReservedTargetKind = "OPEN_CARD" | "DECK_TOP";

export interface CardReservedEvent {
  type: "CARD_RESERVED";
  gameId: GameId;
  actorId: string;
  version: Version;
  payload: {
    targetKind: ReservedTargetKind;
    cardId: string;
    tier: DeckTier;
    grantedGold: boolean;
  };
}
