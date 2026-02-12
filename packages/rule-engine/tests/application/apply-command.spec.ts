import type {
  BuyCardCommand,
  Command,
  EndTurnCommand,
  ReserveCardCommand,
  TakeTokensCommand,
} from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { applyCommand } from "../../src/application/apply-command.js";
import { selectDeckTopCardDeterministically } from "../../src/domain/card-market/card-market.policy.js";
import {
  createBonusWallet,
  createGameState,
  createPlayer,
  createPlayers,
  createTokenWallet,
} from "../helpers/state.factory.js";

describe("명령 적용", () => {
  it("게임이 진행 중이 아니면 명령을 거부한다", () => {
    const state = createGameState({ status: "WAITING" });
    const command: TakeTokensCommand = {
      type: "TAKE_TOKENS",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "take-not-active",
      payload: {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {
        1: [],
      },
    });

    expect(result).toMatchObject({
      ok: false,
      code: "STATE_NOT_ACTIVE",
    });
  });

  it("형식이 잘못된 명령 엔벌로프를 거부한다", () => {
    const state = createGameState();
    const malformedCommand = {
      type: "TAKE_TOKENS",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: -1,
      idempotencyKey: "bad-version",
      payload: {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
    } as unknown as Command;

    const result = applyCommand({
      state,
      command: malformedCommand,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result).toEqual({
      ok: false,
      code: "COMMAND_ENVELOPE_INVALID",
      reason: "INVALID_EXPECTED_VERSION",
    });
  });

  it("토큰 가져오기 명령을 적용하고 지갑/은행/이벤트 버전을 갱신한다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          tokens: createTokenWallet({
            diamond: 2,
            sapphire: 2,
            emerald: 2,
            ruby: 2,
            onyx: 1,
            gold: 0,
          }),
        }),
        createPlayer("p2"),
      ),
    });

    const command: TakeTokensCommand = {
      type: "TAKE_TOKENS",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "take-with-return",
      payload: {
        tokens: {
          diamond: 1,
          sapphire: 1,
          emerald: 1,
        },
        returnedTokens: {
          ruby: 1,
          onyx: 1,
        },
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {
        1: [],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      type: "TOKENS_TAKEN",
      gameId: state.gameId,
      actorId: "p1",
      version: state.version + 1,
      payload: {
        tokens: {
          diamond: 1,
          sapphire: 1,
          emerald: 1,
        },
      },
    });

    expect(result.nextState.players.p1?.tokens).toEqual({
      diamond: 3,
      sapphire: 3,
      emerald: 3,
      ruby: 1,
      onyx: 0,
      gold: 0,
    });
    expect(result.nextState.board.bankTokens).toEqual({
      diamond: 6,
      sapphire: 6,
      emerald: 6,
      ruby: 8,
      onyx: 8,
      gold: 5,
    });
    expect(result.nextState.version).toBe(state.version + 1);
  });

  it("현재 턴이 아닌 플레이어의 토큰 가져오기 명령을 거부한다", () => {
    const state = createGameState({ currentPlayerId: "p1" });
    const command: TakeTokensCommand = {
      type: "TAKE_TOKENS",
      gameId: state.gameId,
      actorId: "p2",
      expectedVersion: state.version,
      idempotencyKey: "take-wrong-turn",
      payload: {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result).toEqual({
      ok: false,
      code: "POLICY_VIOLATION",
      policyCode: "TURN_NOT_CURRENT_PLAYER",
      reason: undefined,
    });
  });

  it("오픈 마켓의 카드 예약 명령을 적용하고 결정론적으로 보충한다", () => {
    const state = createGameState();
    const deckTierOne = ["t1-05", "t1-06", "t1-07"] as const;

    const drawResult = selectDeckTopCardDeterministically({
      seed: state.seed,
      version: state.version,
      tier: 1,
      deckCardIds: [...deckTierOne],
    });
    expect(drawResult.ok).toBe(true);
    if (!drawResult.ok) {
      return;
    }

    const command: ReserveCardCommand = {
      type: "RESERVE_CARD",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "reserve-open",
      payload: {
        target: {
          kind: "OPEN_CARD",
          cardId: "t1-01",
          tier: 1,
        },
        takeGoldToken: true,
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {
        1: deckTierOne,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.events[0]).toMatchObject({
      type: "CARD_RESERVED",
      actorId: "p1",
      payload: {
        targetKind: "OPEN_CARD",
        cardId: "t1-01",
        tier: 1,
        grantedGold: true,
      },
    });

    expect(result.nextState.players.p1?.reservedCardIds).toContain("t1-01");
    expect(result.nextState.players.p1?.tokens.gold).toBe(1);
    expect(result.nextState.board.bankTokens.gold).toBe(4);
    expect(result.nextState.board.openMarketCardIds[1]).toEqual([
      drawResult.value.cardId,
      "t1-02",
      "t1-03",
      "t1-04",
    ]);
  });

  it("덱 컨텍스트가 없으면 오픈 카드 예약을 거부한다", () => {
    const state = createGameState();
    const command: ReserveCardCommand = {
      type: "RESERVE_CARD",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "reserve-open-missing-deck-context",
      payload: {
        target: {
          kind: "OPEN_CARD",
          cardId: "t1-01",
          tier: 1,
        },
        takeGoldToken: true,
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result).toEqual({
      ok: false,
      code: "STATE_INVARIANT_BROKEN",
      reason: "DECK_CONTEXT_REQUIRED",
    });
  });

  it("결정론적 선택으로 덱 상단 카드 예약 명령을 적용한다", () => {
    const state = createGameState();
    const deckTierTwo = ["t2-05", "t2-06", "t2-07"] as const;

    const drawResult = selectDeckTopCardDeterministically({
      seed: state.seed,
      version: state.version,
      tier: 2,
      deckCardIds: [...deckTierTwo],
    });
    expect(drawResult.ok).toBe(true);
    if (!drawResult.ok) {
      return;
    }

    const command: ReserveCardCommand = {
      type: "RESERVE_CARD",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "reserve-deck-top",
      payload: {
        target: {
          kind: "DECK_TOP",
          tier: 2,
        },
        takeGoldToken: false,
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {
        2: deckTierTwo,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.events[0]).toMatchObject({
      type: "CARD_RESERVED",
      payload: {
        targetKind: "DECK_TOP",
        cardId: drawResult.value.cardId,
        tier: 2,
        grantedGold: false,
      },
    });

    expect(result.nextState.players.p1?.reservedCardIds).toContain(
      drawResult.value.cardId,
    );
    expect(result.nextState.board.openMarketCardIds[2]).toEqual([
      "t2-01",
      "t2-02",
      "t2-03",
      "t2-04",
    ]);
  });

  it("오픈 마켓의 카드 구매 명령을 적용하고 보너스/토큰 상태를 갱신한다", () => {
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

    const deckTierOne = ["t1-05", "t1-06"] as const;
    const drawResult = selectDeckTopCardDeterministically({
      seed: state.seed,
      version: state.version,
      tier: 1,
      deckCardIds: [...deckTierOne],
    });
    expect(drawResult.ok).toBe(true);
    if (!drawResult.ok) {
      return;
    }

    const command: BuyCardCommand = {
      type: "BUY_CARD",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "buy-open-card",
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

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {
        1: deckTierOne,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.events[0]).toMatchObject({
      type: "CARD_BOUGHT",
      payload: {
        cardId: "t1-01",
        gainedBonusColor: "onyx",
        scoreDelta: 0,
      },
    });

    expect(result.nextState.players.p1?.tokens).toEqual({
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
      gold: 0,
    });
    expect(result.nextState.players.p1?.bonuses.onyx).toBe(1);
    expect(result.nextState.players.p1?.purchasedCardIds).toContain("t1-01");
    expect(result.nextState.board.bankTokens).toEqual({
      diamond: 8,
      sapphire: 8,
      emerald: 8,
      ruby: 8,
      onyx: 7,
      gold: 5,
    });
    expect(result.nextState.board.openMarketCardIds[1]).toEqual([
      drawResult.value.cardId,
      "t1-02",
      "t1-03",
      "t1-04",
    ]);
  });

  it("덱 컨텍스트에 오픈 카드가 있으면 구매한 카드를 재삽입하지 않는다", () => {
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
      idempotencyKey: "buy-open-contract-regression",
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

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {
        1: ["t1-01", "t1-02", "t1-03", "t1-04", "t1-05"],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.nextState.players.p1?.purchasedCardIds).toContain("t1-01");
    expect(result.nextState.board.openMarketCardIds[1]).not.toContain("t1-01");
    expect(new Set(result.nextState.board.openMarketCardIds[1]).size).toBe(4);
  });

  it("덱 컨텍스트가 없으면 오픈 마켓 구매를 거부한다", () => {
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
      idempotencyKey: "buy-open-missing-deck-context",
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

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result).toEqual({
      ok: false,
      code: "STATE_INVARIANT_BROKEN",
      reason: "DECK_CONTEXT_REQUIRED",
    });
  });

  it("목표 점수 도달 시 카드 구매에서 귀족을 부여하고 파이널 라운드를 시작한다", () => {
    const state = createGameState({
      turn: 9,
      players: createPlayers(
        createPlayer("p1", {
          bonuses: createBonusWallet({
            diamond: 3,
            sapphire: 3,
            emerald: 3,
            ruby: 3,
            onyx: 3,
          }),
          purchasedCardIds: ["t3-20", "t3-20", "t1-08", "t1-08"],
          tokens: createTokenWallet(),
        }),
        createPlayer("p2"),
      ),
      board: {
        openNobleIds: ["noble-03", "noble-01", "noble-10"],
      },
    });

    const command: BuyCardCommand = {
      type: "BUY_CARD",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "buy-trigger-final-round",
      payload: {
        source: {
          kind: "OPEN_MARKET",
          cardId: "t1-01",
        },
        payment: {},
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {
        1: [],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.nextState.players.p1?.nobleIds).toContain("noble-01");
    expect(result.nextState.board.openNobleIds).toEqual([
      "noble-03",
      "noble-10",
    ]);
    expect(result.nextState.players.p1?.score).toBe(15);
    expect(result.nextState.finalRound).toBe(true);
    expect(result.nextState.endTriggeredAtTurn).toBe(9);
    expect(result.nextState.endTriggeredByPlayerId).toBe("p1");
    expect(result.events[0]).toMatchObject({
      type: "CARD_BOUGHT",
      payload: {
        scoreDelta: 3,
      },
    });
  });

  it("턴 종료 명령을 적용하고 턴 메타데이터를 진행시킨다", () => {
    const state = createGameState({
      currentPlayerId: "p1",
      turn: 1,
    });
    const command: EndTurnCommand = {
      type: "END_TURN",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "end-turn-normal",
      payload: {
        reason: "ACTION_COMPLETED",
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      type: "TURN_ENDED",
      gameId: state.gameId,
      actorId: "p1",
      version: state.version + 1,
      payload: {
        previousPlayerId: "p1",
        nextPlayerId: "p2",
        turnNumber: 2,
        roundNumber: 1,
      },
    });
    expect(result.nextState.currentPlayerId).toBe("p2");
    expect(result.nextState.turn).toBe(2);
    expect(result.nextState.status).toBe("IN_PROGRESS");
    expect(result.nextState.version).toBe(state.version + 1);
  });

  it("파이널 라운드가 종료되면 턴 종료와 게임 종료 이벤트를 발생시킨다", () => {
    const state = createGameState({
      version: 18,
      turn: 18,
      finalRound: true,
      endTriggeredAtTurn: 17,
      endTriggeredByPlayerId: "p1",
      currentPlayerId: "p2",
      players: createPlayers(
        createPlayer("p1", {
          purchasedCardIds: ["t3-20"],
        }),
        createPlayer("p2", {
          purchasedCardIds: ["t1-08"],
        }),
      ),
    });

    const command: EndTurnCommand = {
      type: "END_TURN",
      gameId: state.gameId,
      actorId: "p2",
      expectedVersion: state.version,
      idempotencyKey: "end-turn-final-round",
      payload: {
        reason: "ACTION_COMPLETED",
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.type).toBe("TURN_ENDED");
    expect(result.events[0]?.version).toBe(19);
    expect(result.events[1]?.type).toBe("GAME_ENDED");
    expect(result.events[1]?.version).toBe(20);

    const gameEnded = result.events[1];
    if (!gameEnded || gameEnded.type !== "GAME_ENDED") {
      throw new Error("GAME_ENDED event missing");
    }

    expect(gameEnded.payload.reason).toBe("NO_MORE_ROUNDS");
    expect(gameEnded.payload.endTriggeredAtTurn).toBe(17);
    expect(gameEnded.payload.endTriggeredByPlayerId).toBe("p1");
    expect(gameEnded.payload.winnerPlayerIds).toEqual(["p1"]);

    expect(result.nextState.status).toBe("ENDED");
    expect(result.nextState.version).toBe(20);
    expect(result.nextState.winnerPlayerIds).toEqual(["p1"]);
  });

  it("게임 식별자가 일치하지 않는 명령을 거부한다", () => {
    const state = createGameState({ gameId: "game-1" });
    const command: TakeTokensCommand = {
      type: "TAKE_TOKENS",
      gameId: "game-2",
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "take-game-mismatch",
      payload: {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result).toEqual({
      ok: false,
      code: "STATE_INVARIANT_BROKEN",
      reason: "GAME_ID_MISMATCH",
    });
  });
});
