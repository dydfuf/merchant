import { describe, expect, it } from "vitest";

import {
  DEVELOPMENT_CARDS,
  DEVELOPMENT_CARD_COUNT_BY_TIER,
  getCardsByTier,
} from "../../src/domain/card-market/card.catalog.js";
import { PLAYER_SETUP_BY_COUNT } from "../../src/domain/lobby/setup.catalog.js";
import { NOBLE_TILES } from "../../src/domain/nobles/noble.catalog.js";

const GEM_COLORS = ["diamond", "sapphire", "emerald", "ruby", "onyx"] as const;

describe("스플렌더 카탈로그", () => {
  it("개발 카드 90장과 예상된 티어 분할을 포함한다", () => {
    expect(DEVELOPMENT_CARDS).toHaveLength(90);
    expect(getCardsByTier(1)).toHaveLength(DEVELOPMENT_CARD_COUNT_BY_TIER[1]);
    expect(getCardsByTier(2)).toHaveLength(DEVELOPMENT_CARD_COUNT_BY_TIER[2]);
    expect(getCardsByTier(3)).toHaveLength(DEVELOPMENT_CARD_COUNT_BY_TIER[3]);
  });

  it("모든 티어에서 보너스 색상별 카드 구성이 완전하다", () => {
    const countByBonus = DEVELOPMENT_CARDS.reduce<Record<string, number>>(
      (acc, card) => {
        acc[card.bonus] = (acc[card.bonus] ?? 0) + 1;
        return acc;
      },
      {},
    );

    for (const color of GEM_COLORS) {
      expect(countByBonus[color]).toBe(18);
    }
  });

  it("비용 벡터가 유효하며 비어 있지 않다", () => {
    for (const card of DEVELOPMENT_CARDS) {
      const totalCost = GEM_COLORS.reduce(
        (sum, color) => sum + card.cost[color],
        0,
      );
      expect(totalCost).toBeGreaterThan(0);

      for (const color of GEM_COLORS) {
        expect(Number.isInteger(card.cost[color])).toBe(true);
        expect(card.cost[color]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("고정된 실물 덱의 알려진 참조 카드와 일치한다", () => {
    const onePointTier1 = DEVELOPMENT_CARDS.find((card) => card.id === "t1-08");
    const highPointTier3 = DEVELOPMENT_CARDS.find((card) => card.id === "t3-20");

    expect(onePointTier1).toEqual({
      id: "t1-08",
      tier: 1,
      bonus: "onyx",
      points: 1,
      cost: {
        diamond: 0,
        sapphire: 4,
        emerald: 0,
        ruby: 0,
        onyx: 0,
      },
    });

    expect(highPointTier3).toEqual({
      id: "t3-20",
      tier: 3,
      bonus: "ruby",
      points: 5,
      cost: {
        diamond: 0,
        sapphire: 0,
        emerald: 7,
        ruby: 3,
        onyx: 0,
      },
    });
  });

  it("서로 다른 3색 요구조건을 가진 귀족 타일 10개를 포함한다", () => {
    expect(NOBLE_TILES).toHaveLength(10);

    const signatures = new Set<string>();
    for (const noble of NOBLE_TILES) {
      expect(noble.points).toBe(3);

      const requiredColors = GEM_COLORS.filter(
        (color) => noble.requirement[color] > 0,
      );
      expect(requiredColors).toHaveLength(3);

      for (const color of GEM_COLORS) {
        if (noble.requirement[color] > 0) {
          expect(noble.requirement[color]).toBe(3);
        } else {
          expect(noble.requirement[color]).toBe(0);
        }
      }

      signatures.add(
        GEM_COLORS.filter((color) => noble.requirement[color] > 0).join("|"),
      );
    }

    expect(signatures.size).toBe(10);
  });

  it("공식 2-4인 세팅 값을 사용한다", () => {
    expect(PLAYER_SETUP_BY_COUNT[2]).toEqual({
      gemTokensPerColor: 4,
      goldTokens: 5,
      revealedNobles: 3,
    });
    expect(PLAYER_SETUP_BY_COUNT[3]).toEqual({
      gemTokensPerColor: 5,
      goldTokens: 5,
      revealedNobles: 4,
    });
    expect(PLAYER_SETUP_BY_COUNT[4]).toEqual({
      gemTokensPerColor: 7,
      goldTokens: 5,
      revealedNobles: 5,
    });
  });
});
