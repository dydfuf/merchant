import { describe, expect, it } from "vitest";

import { evaluateNobleVisit } from "../../src/domain/nobles/nobles.policy.js";
import {
  createBonusWallet,
  createGameState,
  createPlayer,
  createPlayers,
} from "../helpers/state.factory.js";

describe("귀족 정책", () => {
  it("플레이어가 조건을 충족하지 않으면 부여된 귀족이 없다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          bonuses: createBonusWallet({
            diamond: 1,
            sapphire: 1,
            emerald: 1,
          }),
        }),
        createPlayer("p2"),
      ),
      board: {
        openNobleIds: ["noble-01", "noble-02"],
      },
    });

    const result = evaluateNobleVisit(state, "p1");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      eligibleNobleIds: [],
      grantedNobleId: undefined,
      scoreDelta: 0,
    });
  });

  it("여러 귀족이 가능하면 사전순으로 가장 작은 귀족을 부여한다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          bonuses: createBonusWallet({
            diamond: 3,
            sapphire: 3,
            emerald: 3,
            ruby: 3,
            onyx: 3,
          }),
        }),
        createPlayer("p2"),
      ),
      board: {
        openNobleIds: ["noble-10", "noble-03", "noble-01"],
      },
    });

    const result = evaluateNobleVisit(state, "p1");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.eligibleNobleIds).toEqual([
      "noble-01",
      "noble-03",
      "noble-10",
    ]);
    expect(result.value.grantedNobleId).toBe("noble-01");
    expect(result.value.scoreDelta).toBe(3);
  });

  it("보드 상태의 알 수 없는 귀족 식별자를 거부한다", () => {
    const state = createGameState({
      board: {
        openNobleIds: ["noble-unknown"],
      },
    });

    const result = evaluateNobleVisit(state, "p1");
    expect(result).toEqual({
      ok: false,
      code: "NOBLE_TILE_NOT_FOUND",
    });
  });
});
