import type { BuyCardCommand, ReserveCardCommand } from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { applyCommand } from "../../src/application/apply-command.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
  createTokenWallet,
} from "../helpers/state.factory.js";

describe("applyCommand determinism", () => {
  it("returns identical result for identical RESERVE_CARD(DECK_TOP) input", () => {
    const state = createGameState();
    const command: ReserveCardCommand = {
      type: "RESERVE_CARD",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "det-reserve-deck-top",
      payload: {
        target: {
          kind: "DECK_TOP",
          tier: 2,
        },
        takeGoldToken: false,
      },
    };

    const input = {
      state,
      command,
      playerOrder: ["p1", "p2"] as const,
      deckCardIdsByTier: {
        2: ["t2-05", "t2-06", "t2-07"],
      },
    };

    const first = applyCommand(input);
    const second = applyCommand(input);

    expect(second).toEqual(first);
  });

  it("returns identical result for identical BUY_CARD with refill input", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          tokens: createTokenWallet({
            diamond: 1,
            sapphire: 1,
            emerald: 1,
            ruby: 1,
            onyx: 0,
            gold: 0,
          }),
        }),
        createPlayer("p2"),
      ),
    });

    const command: BuyCardCommand = {
      type: "BUY_CARD",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "det-buy-open",
      payload: {
        source: {
          kind: "OPEN_MARKET",
          cardId: "t1-01",
        },
        payment: {
          diamond: 1,
          sapphire: 1,
          emerald: 1,
          ruby: 1,
        },
      },
    };

    const input = {
      state,
      command,
      playerOrder: ["p1", "p2"] as const,
      deckCardIdsByTier: {
        1: ["t1-05", "t1-06", "t1-07"],
      },
    };

    const first = applyCommand(input);
    const second = applyCommand(input);

    expect(second).toEqual(first);
  });
});
