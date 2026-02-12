import { describe, expect, it } from "vitest";

import {
  mapSnapshotToGameState,
  type GameStateSnapshotInput,
} from "../../src/mappers/game.mapper.js";

function createBaseSnapshot(): GameStateSnapshotInput {
  return {
    gameId: "game-1",
    version: 1,
    status: "IN_PROGRESS",
    seed: "seed-1",
    currentPlayerId: "player-1",
    turn: 3,
    board: {
      bankTokens: {
        diamond: 4,
        sapphire: 4,
        emerald: 4,
        ruby: 4,
        onyx: 4,
        gold: 5,
      },
      openMarketCardIds: {
        1: ["t1-01"],
        2: ["t2-01"],
        3: ["t3-01"],
      },
      openNobleIds: [],
    },
    players: {
      "player-1": {
        id: "player-1",
        score: 0,
        tokens: {
          diamond: 0,
          sapphire: 0,
          emerald: 0,
          ruby: 0,
          onyx: 0,
          gold: 0,
        },
        bonuses: {
          diamond: 0,
          sapphire: 0,
          emerald: 0,
          ruby: 0,
          onyx: 0,
        },
        reservedCardIds: [],
        purchasedCardIds: [],
        nobleIds: [],
      },
    },
  };
}

describe("mapSnapshotToGameState", () => {
  it("injects finalRound=false when legacy snapshot omits it", () => {
    const legacySnapshot = createBaseSnapshot();

    const mapped = mapSnapshotToGameState(legacySnapshot);

    expect(mapped.finalRound).toBe(false);
  });

  it("preserves explicit finalRound value", () => {
    const currentSnapshot: GameStateSnapshotInput = {
      ...createBaseSnapshot(),
      finalRound: true,
    };

    const mapped = mapSnapshotToGameState(currentSnapshot);

    expect(mapped.finalRound).toBe(true);
  });

  it("keeps existing end-trigger metadata", () => {
    const currentSnapshot: GameStateSnapshotInput = {
      ...createBaseSnapshot(),
      finalRound: true,
      endTriggeredAtTurn: 12,
      endTriggeredByPlayerId: "player-2",
    };

    const mapped = mapSnapshotToGameState(currentSnapshot);

    expect(mapped.endTriggeredAtTurn).toBe(12);
    expect(mapped.endTriggeredByPlayerId).toBe("player-2");
  });
});
