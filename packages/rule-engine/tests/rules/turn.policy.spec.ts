import { describe, expect, it } from "vitest";

import {
  evaluateEndTurn,
  evaluateFinalRoundTrigger,
} from "../../src/domain/turn/turn.policy.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
} from "../helpers/state.factory.js";

describe("turn policy", () => {
  it("computes next player and round metadata", () => {
    const state = createGameState({
      currentPlayerId: "p1",
      turn: 4,
    });

    const result = evaluateEndTurn(state, "p1", ["p1", "p2"]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      previousPlayerId: "p1",
      nextPlayerId: "p2",
      turnNumber: 5,
      roundNumber: 3,
      shouldEndGame: false,
      gameEndedReason: undefined,
    });
  });

  it("marks game end when final round loops to trigger player", () => {
    const state = createGameState({
      currentPlayerId: "p2",
      finalRound: true,
      endTriggeredByPlayerId: "p1",
    });

    const result = evaluateEndTurn(state, "p2", ["p1", "p2"]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.shouldEndGame).toBe(true);
    expect(result.value.gameEndedReason).toBe("NO_MORE_ROUNDS");
    expect(result.value.nextPlayerId).toBe("p1");
  });

  it("rejects non-current player", () => {
    const state = createGameState({
      currentPlayerId: "p1",
    });

    const result = evaluateEndTurn(state, "p2", ["p1", "p2"]);
    expect(result).toEqual({
      ok: false,
      code: "TURN_NOT_CURRENT_PLAYER",
    });
  });

  it("rejects invalid player order", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1"),
        createPlayer("p2"),
        createPlayer("p3"),
      ),
      currentPlayerId: "p1",
    });

    const result = evaluateEndTurn(state, "p1", ["p1", "p2"]);
    expect(result).toEqual({
      ok: false,
      code: "TURN_PLAYER_ORDER_INVALID",
    });
  });

  it("triggers final round when current player reaches target score", () => {
    const state = createGameState({
      currentPlayerId: "p1",
      turn: 8,
      finalRound: false,
    });

    const result = evaluateFinalRoundTrigger(state, "p1", 15);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      shouldTriggerFinalRound: true,
      endTriggeredAtTurn: 8,
      endTriggeredByPlayerId: "p1",
    });
  });

  it("does not retrigger final round once already active", () => {
    const state = createGameState({
      finalRound: true,
      endTriggeredByPlayerId: "p1",
    });

    const result = evaluateFinalRoundTrigger(state, "p1", 20);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({
      shouldTriggerFinalRound: false,
    });
  });
});
