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
  expected: {
    layer: "RULE_ENGINE",
    steps: [
      { result: "ok" },
      { result: "ok" },
      { result: "ok" },
      { result: "ok" },
    ],
    eventTypes: ["TOKENS_TAKEN", "CARD_RESERVED", "CARD_BOUGHT", "TURN_ENDED"],
    finalState: {
      version: 5,
      status: "IN_PROGRESS",
      currentPlayerId: "player-2",
      playerSnapshots: {
        "player-1": {
          tokenCount: 0,
          bonusCount: 1,
          reservedCardCount: 0,
        },
        "player-2": {
          tokenCount: 0,
          bonusCount: 0,
          reservedCardCount: 0,
        },
      },
    },
  },
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
} satisfies CommandSequenceScenario<"RULE_ENGINE">;
