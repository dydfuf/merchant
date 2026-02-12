import { describe, expect, it } from "vitest";

import {
  evaluateBuyPayment,
  evaluateTakeTokens,
} from "../../src/domain/economy/economy.policy.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
  createTokenWallet,
} from "../helpers/state.factory.js";

describe("경제 정책", () => {
  it("유효한 반환과 함께 서로 다른 보석 3개 가져오기를 허용한다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          tokens: createTokenWallet({
            diamond: 2,
            sapphire: 2,
            emerald: 2,
            ruby: 2,
            onyx: 1,
            gold: 0,
          }),
        }),
        createPlayer("p2"),
      ),
    });

    const result = evaluateTakeTokens(state, "p1", {
      tokens: {
        diamond: 1,
        sapphire: 1,
        emerald: 1,
      },
      returnedTokens: {
        ruby: 1,
        onyx: 1,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.walletAfter).toEqual({
      diamond: 3,
      sapphire: 3,
      emerald: 3,
      ruby: 1,
      onyx: 0,
      gold: 0,
    });
    expect(result.value.totalTokensAfter).toBe(10);
  });

  it("잘못된 가져오기 패턴을 거부한다", () => {
    const state = createGameState();
    const result = evaluateTakeTokens(state, "p1", {
      tokens: {
        diamond: 1,
        sapphire: 1,
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "ECONOMY_INVALID_TAKE_PATTERN",
    });
  });

  it("은행 보석이 4개 미만이면 같은 색 2개 가져오기를 거부한다", () => {
    const state = createGameState({
      board: {
        bankTokens: createTokenWallet({
          diamond: 3,
          sapphire: 7,
          emerald: 7,
          ruby: 7,
          onyx: 7,
          gold: 5,
        }),
      },
    });

    const result = evaluateTakeTokens(state, "p1", {
      tokens: {
        diamond: 2,
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "ECONOMY_DOUBLE_TAKE_REQUIRES_FOUR_IN_BANK",
    });
  });

  it("반환 후 토큰 한도를 초과하는 가져오기를 거부한다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          tokens: createTokenWallet({
            diamond: 2,
            sapphire: 2,
            emerald: 2,
            ruby: 2,
            onyx: 1,
            gold: 0,
          }),
        }),
        createPlayer("p2"),
      ),
    });

    const result = evaluateTakeTokens(state, "p1", {
      tokens: {
        diamond: 1,
        sapphire: 1,
        emerald: 1,
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "ECONOMY_TOKEN_LIMIT_EXCEEDED",
    });
  });

  it("플레이어가 토큰 한도를 넘지 않으면 반환 토큰을 거부한다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          tokens: createTokenWallet({
            diamond: 1,
            sapphire: 1,
            emerald: 1,
            ruby: 1,
            onyx: 1,
            gold: 2,
          }),
        }),
        createPlayer("p2"),
      ),
    });

    const result = evaluateTakeTokens(state, "p1", {
      tokens: {
        diamond: 1,
        sapphire: 1,
        emerald: 1,
      },
      returnedTokens: {
        ruby: 1,
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "ECONOMY_UNNECESSARY_TOKEN_RETURN",
    });
  });

  it("골드 대체를 포함한 구매 지불을 허용한다", () => {
    const result = evaluateBuyPayment({
      playerTokens: createTokenWallet({
        diamond: 1,
        sapphire: 1,
        emerald: 0,
        ruby: 0,
        onyx: 0,
        gold: 2,
      }),
      playerBonuses: {
        diamond: 1,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      },
      cardCost: {
        diamond: 3,
        sapphire: 1,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      },
      payment: {
        diamond: 1,
        sapphire: 1,
        gold: 1,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.goldSpent).toBe(1);
    expect(result.value.remainingTokens).toEqual({
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
      gold: 1,
    });
  });

  it("초과 지불을 거부한다", () => {
    const result = evaluateBuyPayment({
      playerTokens: createTokenWallet({
        diamond: 2,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
        gold: 0,
      }),
      playerBonuses: {
        diamond: 0,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      },
      cardCost: {
        diamond: 1,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      },
      payment: {
        diamond: 2,
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "ECONOMY_OVERPAYMENT_NOT_ALLOWED",
    });
  });

  it("자금이 부족하면 지불을 거부한다", () => {
    const result = evaluateBuyPayment({
      playerTokens: createTokenWallet({
        diamond: 1,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
        gold: 0,
      }),
      playerBonuses: {
        diamond: 0,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      },
      cardCost: {
        diamond: 2,
        sapphire: 0,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      },
      payment: {
        diamond: 1,
      },
    });

    expect(result).toEqual({
      ok: false,
      code: "ECONOMY_INSUFFICIENT_FUNDS",
    });
  });
});
