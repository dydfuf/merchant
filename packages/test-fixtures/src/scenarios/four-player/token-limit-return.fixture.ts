import { buildTakeTokensCommand } from "../../builders/command.builder.js";
import {
  buildGameState,
  buildPlayerState,
  buildTokenWallet,
} from "../../builders/game-state.builder.js";
import type { SingleCommandScenario } from "../scenario.types.js";

export const tokenLimitReturnFixture = {
  kind: "single-command",
  name: "four-player-token-limit-return",
  layer: "RULE_ENGINE",
  expectedFocus: "4인 토큰 10개 한도 초과 시 반납 규칙 적용",
  initialState: buildGameState({
    currentPlayerId: "player-1",
    players: {
      "player-1": buildPlayerState("player-1", {
        tokens: buildTokenWallet({
          diamond: 2,
          sapphire: 2,
          emerald: 2,
          ruby: 2,
          onyx: 1,
          gold: 0,
        }),
      }),
      "player-2": buildPlayerState("player-2"),
      "player-3": buildPlayerState("player-3"),
      "player-4": buildPlayerState("player-4"),
    },
  }),
  playerOrder: ["player-1", "player-2", "player-3", "player-4"],
  expected: {
    layer: "RULE_ENGINE",
    steps: [{ result: "ok" }],
    eventTypes: ["TOKENS_TAKEN"],
    finalState: {
      version: 2,
      status: "IN_PROGRESS",
      currentPlayerId: "player-1",
      playerSnapshots: {
        "player-1": {
          tokenCount: 10,
          bonusCount: 0,
          reservedCardCount: 0,
        },
        "player-2": {
          tokenCount: 0,
          bonusCount: 0,
          reservedCardCount: 0,
        },
        "player-3": {
          tokenCount: 0,
          bonusCount: 0,
          reservedCardCount: 0,
        },
        "player-4": {
          tokenCount: 0,
          bonusCount: 0,
          reservedCardCount: 0,
        },
      },
    },
  },
  command: buildTakeTokensCommand(
    {
      tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      returnedTokens: { ruby: 1, onyx: 1 },
    },
    {
      actorId: "player-1",
      expectedVersion: 1,
    },
  ),
} satisfies SingleCommandScenario<"RULE_ENGINE">;
