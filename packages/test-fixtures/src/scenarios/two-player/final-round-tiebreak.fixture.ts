import { buildEndTurnCommand } from "../../builders/command.builder.js";
import { buildGameState, buildPlayerState } from "../../builders/game-state.builder.js";
import type { SingleCommandScenario } from "../scenario.types.js";

export const finalRoundTieBreakFixture = {
  kind: "single-command",
  name: "two-player-final-round-tiebreak",
  layer: "RULE_ENGINE",
  expectedFocus: "파이널 라운드 종료 시 동점 타이브레이크 승자 계산",
  initialState: buildGameState({
    version: 18,
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
  playerOrder: ["player-1", "player-2"],
  command: buildEndTurnCommand(
    { reason: "ACTION_COMPLETED" },
    {
      actorId: "player-2",
      expectedVersion: 18,
    },
  ),
} satisfies SingleCommandScenario;
