import type { GameId } from "../common/game-id.js";
import type { Version } from "../common/version.js";
import type { BoardState } from "./board.state.js";
import type { PlayerState } from "./player.state.js";

export type GameStatus = "WAITING" | "IN_PROGRESS" | "ENDED";

export interface GameState {
  gameId: GameId;
  version: Version;
  status: GameStatus;
  seed: string;
  currentPlayerId: string;
  turn: number;
  finalRound: boolean;
  board: BoardState;
  players: Record<string, PlayerState>;
  winnerPlayerIds?: string[];
  endTriggeredAtTurn?: number;
  endTriggeredByPlayerId?: string;
}
