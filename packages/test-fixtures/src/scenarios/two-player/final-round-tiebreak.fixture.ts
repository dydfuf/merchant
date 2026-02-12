import { buildEndTurnCommand } from "../../builders/command.builder.js";
import { buildGameState, buildPlayerState } from "../../builders/game-state.builder.js";

export const finalRoundTieBreakFixture = {
  name: "two-player-final-round-tiebreak",
  initialState: buildGameState({
    turn: 18,
    finalRound: true,
    endTriggeredAtTurn: 17,
    endTriggeredByPlayerId: "player-1",
    currentPlayerId: "player-2",
    players: {
      "player-1": buildPlayerState("player-1", {
        score: 15,
        purchasedCardIds: ["t3-20"],
      }),
      "player-2": buildPlayerState("player-2", {
        score: 15,
        purchasedCardIds: ["t1-08", "t2-01"],
      }),
    },
  }),
  command: buildEndTurnCommand(
    { reason: "ACTION_COMPLETED" },
    {
      actorId: "player-2",
      expectedVersion: 18,
    },
  ),
};
