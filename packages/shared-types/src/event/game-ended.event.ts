import type { GameId } from "../common/game-id.js";
import type { Version } from "../common/version.js";

export type GameEndedReason =
  | "TARGET_SCORE_REACHED"
  | "NO_MORE_ROUNDS"
  | "ADMIN_ENDED";

export interface GameEndedEvent {
  type: "GAME_ENDED";
  gameId: GameId;
  actorId: string;
  version: Version;
  payload: {
    winnerPlayerIds: string[];
    finalScores: Record<string, number>;
    reason: GameEndedReason;
    endTriggeredAtTurn: number;
    endTriggeredByPlayerId: string;
  };
}
