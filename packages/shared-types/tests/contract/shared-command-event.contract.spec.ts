import { describe, expect, it } from "vitest";
import type {
  BuyCardCommand,
  CardReservedEvent,
  GameEndedEvent,
  ReserveCardCommand,
  TakeTokensCommand,
  TurnEndedEvent,
} from "../../src/index.js";

describe("shared command/event contracts", () => {
  it("allows RESERVE_CARD with OPEN_CARD target", () => {
    const command: ReserveCardCommand = {
      type: "RESERVE_CARD",
      gameId: "game-1",
      actorId: "player-1",
      expectedVersion: 1,
      idempotencyKey: "reserve-open-1",
      payload: {
        target: {
          kind: "OPEN_CARD",
          cardId: "t1-01",
          tier: 1,
        },
        takeGoldToken: true,
      },
    };

    expect(command.payload.target.kind).toBe("OPEN_CARD");
    if (command.payload.target.kind === "OPEN_CARD") {
      expect(command.payload.target.cardId).toBe("t1-01");
    }
  });

  it("allows RESERVE_CARD with DECK_TOP target and returnedTokens", () => {
    const command: ReserveCardCommand = {
      type: "RESERVE_CARD",
      gameId: "game-1",
      actorId: "player-1",
      expectedVersion: 2,
      idempotencyKey: "reserve-deck-top-1",
      payload: {
        target: {
          kind: "DECK_TOP",
          tier: 2,
        },
        returnedTokens: {
          gold: 1,
        },
        takeGoldToken: true,
      },
    };

    expect(command.payload.target.kind).toBe("DECK_TOP");
    expect(command.payload.returnedTokens?.gold).toBe(1);
  });

  it("allows TAKE_TOKENS with returnedTokens", () => {
    const command: TakeTokensCommand = {
      type: "TAKE_TOKENS",
      gameId: "game-1",
      actorId: "player-1",
      expectedVersion: 3,
      idempotencyKey: "take-and-return-1",
      payload: {
        tokens: {
          ruby: 1,
          emerald: 1,
          sapphire: 1,
        },
        returnedTokens: {
          onyx: 1,
        },
      },
    };

    expect(command.payload.tokens.ruby).toBe(1);
    expect(command.payload.returnedTokens?.onyx).toBe(1);
  });

  it("requires BUY_CARD source union", () => {
    const reservedSource: BuyCardCommand = {
      type: "BUY_CARD",
      gameId: "game-1",
      actorId: "player-1",
      expectedVersion: 4,
      idempotencyKey: "buy-reserved-1",
      payload: {
        source: {
          kind: "RESERVED",
          cardId: "t1-01",
        },
        payment: {
          diamond: 1,
        },
      },
    };

    const openSource: BuyCardCommand = {
      type: "BUY_CARD",
      gameId: "game-1",
      actorId: "player-1",
      expectedVersion: 4,
      idempotencyKey: "buy-open-1",
      payload: {
        source: {
          kind: "OPEN_MARKET",
          cardId: "t1-02",
        },
        payment: {
          sapphire: 2,
        },
      },
    };

    expect(reservedSource.payload.source.kind).toBe("RESERVED");
    expect(openSource.payload.source.kind).toBe("OPEN_MARKET");
  });

  it("includes TURN_ENDED turn metadata", () => {
    const event: TurnEndedEvent = {
      type: "TURN_ENDED",
      gameId: "game-1",
      actorId: "player-1",
      version: 5,
      payload: {
        previousPlayerId: "player-1",
        nextPlayerId: "player-2",
        turnNumber: 2,
        roundNumber: 1,
      },
    };

    expect(event.payload.turnNumber).toBe(2);
    expect(event.payload.roundNumber).toBe(1);
  });

  it("rejects invalid combinations at type level", () => {
    const invalidReserve: ReserveCardCommand = {
      type: "RESERVE_CARD",
      gameId: "game-1",
      actorId: "player-1",
      expectedVersion: 8,
      idempotencyKey: "reserve-invalid-1",
      payload: {
        target: {
          kind: "DECK_TOP",
          tier: 1,
          // @ts-expect-error DECK_TOP target must not include cardId
          cardId: "t1-99",
        },
        takeGoldToken: false,
      },
    };

    const invalidBuy: BuyCardCommand = {
      type: "BUY_CARD",
      gameId: "game-1",
      actorId: "player-1",
      expectedVersion: 8,
      idempotencyKey: "buy-invalid-1",
      payload: {
        source: {
          kind: "OPEN_MARKET",
          cardId: "t1-05",
        },
        // @ts-expect-error legacy fromReserved field is no longer allowed
        fromReserved: false,
        payment: { ruby: 1 },
      },
    };

    const invalidGameEnded: GameEndedEvent = {
      type: "GAME_ENDED",
      gameId: "game-1",
      actorId: "player-1",
      version: 9,
      payload: {
        winnerPlayerIds: ["player-1"],
        finalScores: { "player-1": 15 },
        reason: "TARGET_SCORE_REACHED",
        endTriggeredAtTurn: 12,
        // @ts-expect-error endTriggeredByPlayerId must be a string
        endTriggeredByPlayerId: 123,
      },
    };

    expect(Boolean(invalidReserve)).toBe(true);
    expect(Boolean(invalidBuy)).toBe(true);
    expect(Boolean(invalidGameEnded)).toBe(true);
  });

  it("includes GAME_ENDED trigger metadata", () => {
    const event: GameEndedEvent = {
      type: "GAME_ENDED",
      gameId: "game-1",
      actorId: "player-1",
      version: 6,
      payload: {
        winnerPlayerIds: ["player-1"],
        finalScores: {
          "player-1": 16,
          "player-2": 14,
        },
        reason: "TARGET_SCORE_REACHED",
        endTriggeredAtTurn: 10,
        endTriggeredByPlayerId: "player-1",
      },
    };

    expect(event.payload.endTriggeredAtTurn).toBe(10);
    expect(event.payload.endTriggeredByPlayerId).toBe("player-1");
  });

  it("includes CARD_RESERVED target metadata", () => {
    const event: CardReservedEvent = {
      type: "CARD_RESERVED",
      gameId: "game-1",
      actorId: "player-1",
      version: 7,
      payload: {
        targetKind: "DECK_TOP",
        cardId: "t2-01",
        tier: 2,
        grantedGold: true,
      },
    };

    expect(event.payload.targetKind).toBe("DECK_TOP");
  });
});
