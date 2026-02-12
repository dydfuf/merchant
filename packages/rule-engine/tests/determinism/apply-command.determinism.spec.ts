import type { BuyCardCommand, ReserveCardCommand } from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { applyCommand } from "../../src/application/apply-command.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
  createTokenWallet,
} from "../helpers/state.factory.js";

describe("명령 적용 결정론", () => {
  it("동일한 카드 예약(덱 상단) 입력에 대해 동일한 결과를 반환한다", () => {
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

  it("보충이 있는 동일한 카드 구매 입력에 대해 동일한 결과를 반환한다", () => {
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
