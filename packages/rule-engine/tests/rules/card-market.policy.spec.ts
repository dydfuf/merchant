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

describe("카드 마켓 정책", () => {
  it("오픈 마켓 카드 예약을 허용한다", () => {
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

  it("플레이어가 이미 예약 카드 3장을 보유하면 예약을 거부한다", () => {
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

  it("덱 컨텍스트 없이 덱 상단 예약을 거부한다", () => {
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

  it("제공된 덱 컨텍스트로 덱 상단 예약을 허용한다", () => {
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

  it("오픈 마켓 구매를 허용한다", () => {
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

  it("예약 카드 구매를 허용한다", () => {
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

  it("카드가 플레이어에게 예약되어 있지 않으면 예약 구매를 거부한다", () => {
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

  it("동일한 입력에서 결정론적 덱 상단 선택 결과를 반환한다", () => {
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
