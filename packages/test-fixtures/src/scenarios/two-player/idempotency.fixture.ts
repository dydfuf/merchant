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
} satisfies CommandSequenceScenario;
