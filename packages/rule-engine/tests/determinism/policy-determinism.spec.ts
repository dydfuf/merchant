import { describe, expect, it } from "vitest";

import { evaluateTakeTokens } from "../../src/domain/economy/economy.policy.js";
import { selectDeckTopCardDeterministically } from "../../src/domain/card-market/card-market.policy.js";
import { evaluateEndTurn } from "../../src/domain/turn/turn.policy.js";
import { createGameState } from "../helpers/state.factory.js";

describe("policy determinism", () => {
  it("returns same take-token result for identical inputs", () => {
    const state = createGameState();
    const payload = {
      tokens: {
        diamond: 1,
        sapphire: 1,
        emerald: 1,
      },
    } as const;

    const first = evaluateTakeTokens(state, "p1", payload);
    const second = evaluateTakeTokens(state, "p1", payload);

    expect(first).toEqual(second);
  });

  it("returns same deck-top selection for identical seed and deck", () => {
    const input = {
      seed: "seed-10",
      version: 3,
      tier: 2 as const,
      deckCardIds: ["t2-10", "t2-11", "t2-12", "t2-13"],
    };

    const first = selectDeckTopCardDeterministically(input);
    const second = selectDeckTopCardDeterministically(input);

    expect(first).toEqual(second);
  });

  it("returns same end-turn result for identical turn state", () => {
    const state = createGameState({
      currentPlayerId: "p1",
      turn: 11,
    });

    const first = evaluateEndTurn(state, "p1", ["p1", "p2"]);
    const second = evaluateEndTurn(state, "p1", ["p1", "p2"]);

    expect(first).toEqual(second);
  });
});
