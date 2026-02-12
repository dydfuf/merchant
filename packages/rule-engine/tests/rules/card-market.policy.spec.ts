import { describe, expect, it } from "vitest";

import {
  evaluateBuySource,
  evaluateReserveCard,
  selectDeckTopCardDeterministically,
} from "../../src/domain/card-market/card-market.policy.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
} from "../helpers/state.factory.js";

describe("card-market policy", () => {
  it("accepts reserving an open market card", () => {
    const state = createGameState();
    const result = evaluateReserveCard(state, "p1", {
      target: {
        kind: "OPEN_CARD",
        cardId: "t1-01",
        tier: 1,
      },
      takeGoldToken: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toMatchObject({
      cardId: "t1-01",
      tier: 1,
      targetKind: "OPEN_CARD",
      grantedGold: true,
      requiresRefill: true,
    });
  });

  it("rejects reserve when player already has three reserved cards", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          reservedCardIds: ["t1-01", "t1-02", "t1-03"],
        }),
        createPlayer("p2"),
      ),
    });

    const result = evaluateReserveCard(state, "p1", {
      target: {
        kind: "OPEN_CARD",
        cardId: "t1-04",
        tier: 1,
      },
      takeGoldToken: true,
    });

    expect(result).toEqual({
      ok: false,
      code: "MARKET_RESERVE_LIMIT_REACHED",
    });
  });

  it("rejects deck-top reserve without deck context", () => {
    const state = createGameState();
    const result = evaluateReserveCard(state, "p1", {
      target: {
        kind: "DECK_TOP",
        tier: 2,
      },
      takeGoldToken: false,
    });

    expect(result).toEqual({
      ok: false,
      code: "MARKET_DECK_EMPTY",
    });
  });

  it("accepts deck-top reserve with provided deck context", () => {
    const state = createGameState();
    const result = evaluateReserveCard(
      state,
      "p1",
      {
        target: {
          kind: "DECK_TOP",
          tier: 2,
        },
        takeGoldToken: false,
      },
      {
        deckTopCardIdsByTier: {
          2: "t2-01",
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toMatchObject({
      cardId: "t2-01",
      targetKind: "DECK_TOP",
      requiresRefill: false,
    });
  });

  it("accepts buying from open market", () => {
    const state = createGameState();
    const result = evaluateBuySource(state, "p1", {
      kind: "OPEN_MARKET",
      cardId: "t2-01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({
      cardId: "t2-01",
      tier: 2,
      sourceKind: "OPEN_MARKET",
      requiresRefill: true,
    });
  });

  it("accepts buying from reserved cards", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          reservedCardIds: ["t3-01"],
        }),
        createPlayer("p2"),
      ),
    });

    const result = evaluateBuySource(state, "p1", {
      kind: "RESERVED",
      cardId: "t3-01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({
      cardId: "t3-01",
      tier: 3,
      sourceKind: "RESERVED",
      requiresRefill: false,
    });
  });

  it("rejects reserved buy when card is not reserved by player", () => {
    const state = createGameState();
    const result = evaluateBuySource(state, "p1", {
      kind: "RESERVED",
      cardId: "t3-01",
    });

    expect(result).toEqual({
      ok: false,
      code: "MARKET_CARD_NOT_RESERVED",
    });
  });

  it("returns deterministic deck-top selection for same input", () => {
    const input = {
      seed: "seed-42",
      version: 7,
      tier: 3 as const,
      deckCardIds: ["t3-01", "t3-02", "t3-03", "t3-04"],
    };

    const first = selectDeckTopCardDeterministically(input);
    const second = selectDeckTopCardDeterministically(input);

    expect(first).toEqual(second);
  });
});
