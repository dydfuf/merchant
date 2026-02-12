import type { GameId } from "../common/game-id.js";
import type { Version } from "../common/version.js";

export interface TurnEndedEvent {
  type: "TURN_ENDED";
  gameId: GameId;
  actorId: string;
  version: Version;
  payload: {
    previousPlayerId: string;
    nextPlayerId: string;
    turn: number;
  };
}
