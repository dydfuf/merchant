import { buildBuyCardCommand } from "../../builders/command.builder.js";
import {
  buildBonusWallet,
  buildGameState,
  buildPlayerState,
} from "../../builders/game-state.builder.js";
import type { SingleCommandScenario } from "../scenario.types.js";

export const nobleDoubleEligibilityFixture = {
  kind: "single-command",
  name: "three-player-noble-double-eligibility",
  layer: "RULE_ENGINE",
  expectedFocus: "복수 귀족 자격 시 deterministic 단일 귀족 선택",
  initialState: buildGameState({
    currentPlayerId: "player-1",
    players: {
      "player-1": buildPlayerState("player-1", {
        bonuses: buildBonusWallet({
          diamond: 3,
          sapphire: 3,
          emerald: 3,
          ruby: 3,
          onyx: 3,
        }),
        purchasedCardIds: ["t2-01"],
      }),
      "player-2": buildPlayerState("player-2"),
      "player-3": buildPlayerState("player-3"),
    },
    board: {
      openNobleIds: ["noble-03", "noble-01", "noble-10"],
    },
  }),
  playerOrder: ["player-1", "player-2", "player-3"],
  deckCardIdsByTier: {
    2: ["t2-05", "t2-06", "t2-07", "t2-08"],
  },
  command: buildBuyCardCommand(
    {
      source: { kind: "OPEN_MARKET", cardId: "t2-02" },
      payment: {},
    },
    {
      actorId: "player-1",
      expectedVersion: 1,
    },
  ),
} satisfies SingleCommandScenario;
