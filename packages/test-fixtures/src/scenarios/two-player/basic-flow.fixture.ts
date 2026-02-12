import {
  buildBuyCardCommand,
  buildEndTurnCommand,
  buildReserveCardCommand,
  buildTakeTokensCommand,
} from "../../builders/command.builder.js";
import { buildGameState } from "../../builders/game-state.builder.js";
import type { CommandSequenceScenario } from "../scenario.types.js";

export const basicTwoPlayerFlowFixture = {
  kind: "command-sequence",
  name: "two-player-basic-flow",
  layer: "RULE_ENGINE",
  expectedFocus: "2인 기본 흐름 상태전이와 이벤트/스냅샷 동기화",
  initialState: buildGameState(),
  playerOrder: ["player-1", "player-2"],
  deckCardIdsByTier: {
    1: ["t1-05", "t1-06", "t1-07", "t1-08"],
  },
  commands: [
    buildTakeTokensCommand({
      tokens: { diamond: 1, sapphire: 1, emerald: 1 },
    }),
    buildReserveCardCommand({
      target: { kind: "OPEN_CARD", cardId: "t1-01", tier: 1 },
      takeGoldToken: true,
    }),
    buildBuyCardCommand({
      source: { kind: "RESERVED", cardId: "t1-01" },
      payment: { diamond: 1, sapphire: 1, emerald: 1, gold: 1 },
    }),
    buildEndTurnCommand({ reason: "ACTION_COMPLETED" }),
  ],
} satisfies CommandSequenceScenario;
