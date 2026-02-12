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

describe("점수 정책", () => {
  it("구매 카드와 귀족으로 점수를 계산한다", () => {
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

  it("최고 점수로 승자를 선택한다", () => {
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

  it("동점이면 구매 카드 수가 적은 플레이어를 우선한다", () => {
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

  it("점수와 카드 수가 모두 같으면 공동 승자를 반환한다", () => {
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

  it("플레이어 점수가 누락된 최종 점수 입력을 거부한다", () => {
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

  it("알 수 없는 플레이어 식별자가 있는 최종 점수 입력을 거부한다", () => {
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

  it("알 수 없는 구매 카드 식별자를 거부한다", () => {
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
