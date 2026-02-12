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

describe("economy policy", () => {
  it("accepts taking three different gems with valid returns", () => {
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

  it("rejects invalid take pattern", () => {
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

  it("rejects double-take when fewer than four gems are in bank", () => {
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

  it("rejects takes that exceed token limit after returns", () => {
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

  it("rejects returned tokens when player does not exceed token limit", () => {
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

  it("accepts buy payment with gold substitution", () => {
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

  it("rejects overpayment", () => {
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

  it("rejects payment when funds are insufficient", () => {
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
