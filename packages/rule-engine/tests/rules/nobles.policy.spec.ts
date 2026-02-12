import { describe, expect, it } from "vitest";

import { evaluateNobleVisit } from "../../src/domain/nobles/nobles.policy.js";
import {
  createBonusWallet,
  createGameState,
  createPlayer,
  createPlayers,
} from "../helpers/state.factory.js";

describe("nobles policy", () => {
  it("returns no granted noble when player is not eligible", () => {
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

  it("grants lexicographically smallest noble when multiple are eligible", () => {
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

  it("rejects unknown noble id in board state", () => {
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
