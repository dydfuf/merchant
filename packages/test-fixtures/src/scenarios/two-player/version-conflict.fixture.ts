import type { Command } from "@repo/shared-types";

import { buildTakeTokensCommand } from "../../builders/command.builder.js";
import { buildGameState } from "../../builders/game-state.builder.js";

export const versionConflictFixture: {
  name: string;
  initialState: ReturnType<typeof buildGameState>;
  commands: Command[];
} = {
  name: "two-player-version-conflict",
  initialState: buildGameState({
    version: 3,
  }),
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
};
