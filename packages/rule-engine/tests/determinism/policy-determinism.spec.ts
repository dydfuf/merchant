import { describe, expect, it } from "vitest";

import { evaluateTakeTokens } from "../../src/domain/economy/economy.policy.js";
import { selectDeckTopCardDeterministically } from "../../src/domain/card-market/card-market.policy.js";
import { evaluateEndTurn } from "../../src/domain/turn/turn.policy.js";
import { createGameState } from "../helpers/state.factory.js";

describe("정책 결정론", () => {
  it("동일한 입력에서 동일한 토큰 획득 결과를 반환한다", () => {
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

  it("동일한 시드와 덱에서 동일한 덱 상단 선택 결과를 반환한다", () => {
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

  it("동일한 턴 상태에서 동일한 턴 종료 결과를 반환한다", () => {
    const state = createGameState({
      currentPlayerId: "p1",
      turn: 11,
    });

    const first = evaluateEndTurn(state, "p1", ["p1", "p2"]);
    const second = evaluateEndTurn(state, "p1", ["p1", "p2"]);

    expect(first).toEqual(second);
  });
});
