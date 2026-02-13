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
  expected: {
    layer: "GAME_SERVER",
    steps: [
      { kind: "accepted" },
      { kind: "rejected", reason: "VERSION_CONFLICT" },
    ],
    finalState: {
      version: 4,
      status: "IN_PROGRESS",
      currentPlayerId: "player-1",
      playerSnapshots: {
        "player-1": {
          tokenCount: 3,
          bonusCount: 0,
          reservedCardCount: 0,
        },
        "player-2": {
          tokenCount: 0,
          bonusCount: 0,
          reservedCardCount: 0,
        },
      },
    },
    persistCallCount: 1,
  },
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
} satisfies CommandSequenceScenario<"GAME_SERVER">;
