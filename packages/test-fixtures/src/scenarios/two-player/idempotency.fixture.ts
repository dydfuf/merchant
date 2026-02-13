import { buildTakeTokensCommand } from "../../builders/command.builder.js";
import { buildGameState } from "../../builders/game-state.builder.js";
import type { CommandSequenceScenario } from "../scenario.types.js";

const DUPLICATED_KEY = "idempotency:take:three-gems";

export const idempotencyFixture = {
  kind: "command-sequence",
  name: "two-player-idempotency",
  layer: "GAME_SERVER",
  expectedFocus: "멱등성 중복키 처리(서버 오케스트레이션 범위)",
  initialState: buildGameState(),
  playerOrder: ["player-1", "player-2"],
  expected: {
    layer: "GAME_SERVER",
    steps: [{ kind: "accepted" }, { kind: "replayed" }],
    finalState: {
      version: 2,
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
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        idempotencyKey: DUPLICATED_KEY,
      },
    ),
    buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        idempotencyKey: DUPLICATED_KEY,
      },
    ),
  ],
} satisfies CommandSequenceScenario<"GAME_SERVER">;
