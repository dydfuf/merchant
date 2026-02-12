import { buildTakeTokensCommand } from "../../builders/command.builder.js";
import { buildGameState } from "../../builders/game-state.builder.js";
import type { CommandSequenceScenario } from "../scenario.types.js";

export const versionConflictFixture = {
  kind: "command-sequence",
  name: "two-player-version-conflict",
  layer: "GAME_SERVER",
  expectedFocus: "expectedVersion 충돌 처리(서버 오케스트레이션 범위)",
  initialState: buildGameState({
    version: 3,
  }),
  playerOrder: ["player-1", "player-2"],
  commands: [
    buildTakeTokensCommand(
      {
        tokens: { ruby: 1, emerald: 1, sapphire: 1 },
      },
      {
        expectedVersion: 3,
      },
    ),
    buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, onyx: 1 },
      },
      {
        expectedVersion: 3,
      },
    ),
  ],
} satisfies CommandSequenceScenario;
