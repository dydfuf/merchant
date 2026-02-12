import { buildBuyCardCommand } from "../../builders/command.builder.js";
import {
  buildBonusWallet,
  buildGameState,
  buildPlayerState,
} from "../../builders/game-state.builder.js";

export const nobleDoubleEligibilityFixture = {
  name: "three-player-noble-double-eligibility",
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
  command: buildBuyCardCommand(
    {
      source: { kind: "OPEN_MARKET", cardId: "t2-02" },
      payment: { diamond: 1, sapphire: 1 },
    },
    {
      actorId: "player-1",
      expectedVersion: 1,
    },
  ),
};
