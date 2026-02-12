import type { Command } from "@repo/shared-types";

import { buildTakeTokensCommand } from "../../builders/command.builder.js";
import { buildGameState } from "../../builders/game-state.builder.js";

const DUPLICATED_KEY = "idempotency:take:three-gems";

export const idempotencyFixture: {
  name: string;
  initialState: ReturnType<typeof buildGameState>;
  commands: Command[];
} = {
  name: "two-player-idempotency",
  initialState: buildGameState(),
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
};
