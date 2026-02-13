import type { GameEvent, GameState } from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { InMemoryCommandRepository } from "../../src/repositories/command.repository.js";
import { InMemoryEventRepository } from "../../src/repositories/event.repository.js";
import {
  InMemoryGameRepository,
  type StoredGameSnapshot,
} from "../../src/repositories/game.repository.js";
import { InMemoryGameTransactionRunner } from "../../src/transactions/game.transaction.js";

const PLAYER_ORDER = ["player-1", "player-2"] as const;

describe("인메모리 게임 레지스트리", () => {
  it("게임 스냅샷을 생성하고 조회할 수 있다", async () => {
    const repository = new InMemoryGameRepository();
    const snapshot = createSnapshot("game-1");

    await repository.create(snapshot);

    const loaded = await repository.load("game-1");
    expect(loaded).toEqual(snapshot);

    if (!loaded) {
      throw new Error("스냅샷이 없습니다.");
    }

    loaded.state.version = 99;

    const reloaded = await repository.load("game-1");
    expect(reloaded?.state.version).toBe(1);
  });

  it("동일 게임을 중복 생성하면 실패한다", async () => {
    const repository = new InMemoryGameRepository();
    const snapshot = createSnapshot("game-dup");

    await repository.create(snapshot);

    await expect(repository.create(snapshot)).rejects.toThrow(
      "GAME_ALREADY_EXISTS:game-dup",
    );
  });

  it("커맨드 성공 기록을 멱등키로 저장하고 조회할 수 있다", async () => {
    const repository = new InMemoryCommandRepository();
    const state = createSnapshot("game-2").state;

    await repository.saveSuccess({
      gameId: "game-2",
      idempotencyKey: "idempotency-1",
      commandFingerprint: "fingerprint-1",
      events: [createEvent("game-2", 2)],
      nextState: {
        ...state,
        version: 2,
      },
    });

    const record = await repository.loadSuccess("game-2", "idempotency-1");
    expect(record?.commandFingerprint).toBe("fingerprint-1");
    expect(record?.events).toHaveLength(1);
  });

  it("이벤트를 append 순서대로 조회할 수 있다", async () => {
    const repository = new InMemoryEventRepository();

    await repository.append("game-3", [
      createEvent("game-3", 2),
      createEvent("game-3", 3),
    ]);
    await repository.append("game-3", [createEvent("game-3", 4)]);

    const events = await repository.list("game-3");
    expect(events.map((event) => event.version)).toEqual([2, 3, 4]);
  });

  it("트랜잭션 러너는 같은 게임 연산을 직렬화한다", async () => {
    const runner = new InMemoryGameTransactionRunner();
    const executed: number[] = [];

    await Promise.all([
      runner.run("game-lock", async () => {
        await delay(20);
        executed.push(1);
      }),
      runner.run("game-lock", async () => {
        executed.push(2);
      }),
    ]);

    expect(executed).toEqual([1, 2]);
  });
});

function createSnapshot(gameId: string): StoredGameSnapshot {
  return {
    gameId,
    state: createGameState(gameId),
    playerOrder: PLAYER_ORDER,
    deckCardIdsByTier: {
      1: ["t1-01", "t1-02", "t1-03", "t1-04"],
      2: ["t2-01", "t2-02", "t2-03", "t2-04"],
      3: ["t3-01", "t3-02", "t3-03", "t3-04"],
    },
  };
}

function createGameState(gameId: string): GameState {
  return {
    gameId,
    version: 1,
    status: "IN_PROGRESS",
    seed: "seed-local",
    currentPlayerId: "player-1",
    turn: 1,
    finalRound: false,
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
        1: ["t1-01", "t1-02", "t1-03", "t1-04"],
        2: ["t2-01", "t2-02", "t2-03", "t2-04"],
        3: ["t3-01", "t3-02", "t3-03", "t3-04"],
      },
      openNobleIds: ["noble-01", "noble-02", "noble-03"],
    },
    players: {
      "player-1": createPlayerState("player-1"),
      "player-2": createPlayerState("player-2"),
    },
  };
}

function createPlayerState(id: string): GameState["players"][string] {
  return {
    id,
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
  };
}

function createEvent(gameId: string, version: number): GameEvent {
  return {
    type: "TURN_ENDED",
    gameId,
    actorId: "player-1",
    version,
    payload: {
      previousPlayerId: "player-1",
      nextPlayerId: "player-2",
      turnNumber: version,
      roundNumber: 1,
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
