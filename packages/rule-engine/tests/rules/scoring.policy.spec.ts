import { describe, expect, it } from "vitest";

import {
  evaluatePlayerScore,
  resolveGameWinners,
} from "../../src/domain/scoring/scoring.policy.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
} from "../helpers/state.factory.js";

describe("scoring policy", () => {
  it("computes score from purchased cards and nobles", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          purchasedCardIds: ["t1-08", "t3-20"],
          nobleIds: ["noble-01"],
        }),
        createPlayer("p2"),
      ),
    });

    const result = evaluatePlayerScore(state, "p1");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.score).toBe(9);
    expect(result.value.reachedTarget).toBe(false);
    expect(result.value.breakdown).toEqual({
      cardPoints: 6,
      noblePoints: 3,
      total: 9,
    });
  });

  it("selects winner by highest score", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", { purchasedCardIds: ["t3-20"] }),
        createPlayer("p2", { purchasedCardIds: ["t1-08"] }),
      ),
    });

    const result = resolveGameWinners(state, {
      p1: 16,
      p2: 13,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.winnerPlayerIds).toEqual(["p1"]);
    expect(result.value.tieBrokenByCardCount).toBe(false);
  });

  it("breaks ties by fewer purchased cards", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          purchasedCardIds: ["t3-20"],
        }),
        createPlayer("p2", {
          purchasedCardIds: ["t1-08", "t2-01"],
        }),
      ),
    });

    const result = resolveGameWinners(state, {
      p1: 15,
      p2: 15,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.winnerPlayerIds).toEqual(["p1"]);
    expect(result.value.tieBrokenByCardCount).toBe(true);
  });

  it("returns shared winners when both score and card count are tied", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          purchasedCardIds: ["t3-20"],
        }),
        createPlayer("p2", {
          purchasedCardIds: ["t2-01"],
        }),
      ),
    });

    const result = resolveGameWinners(state, {
      p1: 15,
      p2: 15,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.winnerPlayerIds).toEqual(["p1", "p2"]);
    expect(result.value.tieBrokenByCardCount).toBe(false);
  });

  it("rejects provided final scores when a player score is missing", () => {
    const state = createGameState({
      players: createPlayers(createPlayer("p1"), createPlayer("p2")),
    });

    const result = resolveGameWinners(state, {
      p1: 15,
    });

    expect(result).toEqual({
      ok: false,
      code: "SCORING_FINAL_SCORES_INVALID",
    });
  });

  it("rejects provided final scores with unknown player ids", () => {
    const state = createGameState({
      players: createPlayers(createPlayer("p1"), createPlayer("p2")),
    });

    const result = resolveGameWinners(state, {
      p1: 15,
      p2: 14,
      ghost: 99,
    });

    expect(result).toEqual({
      ok: false,
      code: "SCORING_FINAL_SCORES_INVALID",
    });
  });

  it("rejects unknown purchased card ids", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          purchasedCardIds: ["card-missing"],
        }),
        createPlayer("p2"),
      ),
    });

    const result = evaluatePlayerScore(state, "p1");
    expect(result).toEqual({
      ok: false,
      code: "SCORING_CARD_NOT_FOUND",
    });
  });
});
