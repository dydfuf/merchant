import type { GameState } from "@repo/shared-types";

export type GameStateSnapshotInput = Omit<GameState, "finalRound"> & {
  finalRound?: boolean;
};

export function mapSnapshotToGameState(
  snapshot: GameStateSnapshotInput,
): GameState {
  return {
    ...snapshot,
    finalRound: snapshot.finalRound ?? false,
  };
}
