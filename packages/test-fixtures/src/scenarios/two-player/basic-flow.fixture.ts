import type { Command } from "@repo/shared-types";

import {
  buildBuyCardCommand,
  buildEndTurnCommand,
  buildReserveCardCommand,
  buildTakeTokensCommand,
} from "../../builders/command.builder.js";
import { buildGameState } from "../../builders/game-state.builder.js";

export const basicTwoPlayerFlowFixture: {
  name: string;
  initialState: ReturnType<typeof buildGameState>;
  commands: Command[];
} = {
  name: "two-player-basic-flow",
  initialState: buildGameState(),
  commands: [
    buildTakeTokensCommand({
      tokens: { diamond: 1, sapphire: 1, emerald: 1 },
    }),
    buildReserveCardCommand({
      target: { kind: "OPEN_CARD", cardId: "t1-01", tier: 1 },
      takeGoldToken: true,
    }),
    buildBuyCardCommand({
      source: { kind: "OPEN_MARKET", cardId: "t1-02" },
      payment: { diamond: 1 },
    }),
    buildEndTurnCommand({ reason: "ACTION_COMPLETED" }),
  ],
};
