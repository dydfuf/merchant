import type {
  Command,
  DeckTier,
  GameEvent,
  GameState,
} from "@repo/shared-types";
import {
  buildGameState,
  buildTakeTokensCommand,
  gameServerScenarios,
  idempotencyFixture,
  type SplendorScenario,
  versionConflictFixture,
} from "@repo/test-fixtures";
import { describe, expect, it } from "vitest";

import type {
  GameCommandContext,
  GameCommandRepositoryPort,
  PersistCommandSuccessInput,
  StoredCommandSuccessRecord,
} from "../../src/application/commands/command-handler.port.js";
import { evaluateIdempotencyKey } from "../../src/application/policies/idempotency.policy.js";
import type { GameCommandRejectedReason } from "../../src/application/services/game-command.service.js";
import { GameCommandService } from "../../src/application/services/game-command.service.js";

describe("멱등성 키 평가 정책", () => {
  it("중복 키는 거부하고 새로운 키는 허용한다", () => {
    const seenKeys = new Set(["command-1"]);

    expect(evaluateIdempotencyKey(seenKeys, "command-1")).toBe(
      "reject_duplicate",
    );
    expect(evaluateIdempotencyKey(seenKeys, "command-2")).toBe("accept");
  });
});

describe("게임 커맨드 서비스", () => {
  it("중복 idempotency 키는 기존 결과를 재응답한다", async () => {
    const firstCommand = idempotencyFixture.commands[0];
    const duplicateCommand = idempotencyFixture.commands[1];
    if (!firstCommand || !duplicateCommand) {
      throw new Error("idempotency fixture에 두 개의 command가 필요합니다.");
    }

    const repository = new FakeGameCommandRepository([
      {
        gameId: idempotencyFixture.initialState.gameId,
        state: idempotencyFixture.initialState,
        playerOrder: idempotencyFixture.playerOrder,
        deckCardIdsByTier: {},
      },
    ]);
    const service = new GameCommandService({ repository });

    const firstResult = await service.handle(firstCommand);
    expect(firstResult.kind).toBe("accepted");

    const replayResult = await service.handle(duplicateCommand);
    expect(replayResult.kind).toBe("replayed");

    if (firstResult.kind !== "accepted" || replayResult.kind !== "replayed") {
      throw new Error("중복 멱등성 테스트가 기대와 다른 경로로 실행되었습니다.");
    }

    expect(replayResult.events).toEqual(firstResult.events);
    expect(replayResult.nextState).toEqual(firstResult.nextState);
    expect(repository.persistCallCount).toBe(1);
  });

  it("expectedVersion 충돌은 버전 충돌로 거절한다", async () => {
    const firstCommand = versionConflictFixture.commands[0];
    const secondCommand = versionConflictFixture.commands[1];
    if (!firstCommand || !secondCommand) {
      throw new Error("version conflict fixture에 두 개의 command가 필요합니다.");
    }

    const repository = new FakeGameCommandRepository([
      {
        gameId: versionConflictFixture.initialState.gameId,
        state: versionConflictFixture.initialState,
        playerOrder: versionConflictFixture.playerOrder,
        deckCardIdsByTier: {},
      },
    ]);
    const service = new GameCommandService({ repository });

    const firstResult = await service.handle(firstCommand);
    expect(firstResult.kind).toBe("accepted");

    const conflictResult = await service.handle(secondCommand);
    expect(conflictResult).toMatchObject({
      kind: "rejected",
      reason: "VERSION_CONFLICT",
      retryable: false,
    });
    expect(repository.persistCallCount).toBe(1);
  });

  it("정책 실패는 policyCode를 보존한다", async () => {
    const initialState = buildGameState({
      currentPlayerId: "player-2",
    });
    const repository = new FakeGameCommandRepository([
      {
        gameId: initialState.gameId,
        state: initialState,
        playerOrder: ["player-1", "player-2"],
        deckCardIdsByTier: {},
      },
    ]);
    const service = new GameCommandService({ repository });
    const command = buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        gameId: initialState.gameId,
        actorId: "player-1",
        expectedVersion: initialState.version,
        idempotencyKey: "policy-violation-turn-order",
      },
    );

    const result = await service.handle(command);

    expect(result).toMatchObject({
      kind: "rejected",
      reason: "POLICY_VIOLATION",
      policyCode: "TURN_NOT_CURRENT_PLAYER",
      retryable: false,
    });
  });

  it("저장소 실패는 재시도 가능한 인프라 오류로 분류한다", async () => {
    const initialState = buildGameState();
    const repository = new FakeGameCommandRepository([
      {
        gameId: initialState.gameId,
        state: initialState,
        playerOrder: ["player-1", "player-2"],
        deckCardIdsByTier: {},
      },
    ]);
    repository.shouldFailPersist = true;

    const service = new GameCommandService({ repository });
    const command = buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        gameId: initialState.gameId,
        actorId: "player-1",
        expectedVersion: initialState.version,
        idempotencyKey: "persist-failure",
      },
    );

    const result = await service.handle(command);
    expect(result).toMatchObject({
      kind: "rejected",
      reason: "INFRA_FAILURE",
      retryable: true,
    });
  });

  it("idempotency 키가 비어 있으면 즉시 거절한다", async () => {
    const initialState = buildGameState();
    const repository = new FakeGameCommandRepository([
      {
        gameId: initialState.gameId,
        state: initialState,
        playerOrder: ["player-1", "player-2"],
        deckCardIdsByTier: {},
      },
    ]);
    const service = new GameCommandService({ repository });
    const command = buildTakeTokensCommand(
      {
        tokens: { ruby: 1, emerald: 1, sapphire: 1 },
      },
      {
        gameId: initialState.gameId,
        actorId: "player-1",
        expectedVersion: initialState.version,
        idempotencyKey: "   ",
      },
    );

    const result = await service.handle(command);
    expect(result).toMatchObject({
      kind: "rejected",
      reason: "MISSING_IDEMPOTENCY_KEY",
      retryable: false,
    });
    expect(repository.persistCallCount).toBe(0);
  });

  it("동일 idempotency 키에 다른 payload가 오면 거절한다", async () => {
    const initialState = buildGameState();
    const repository = new FakeGameCommandRepository([
      {
        gameId: initialState.gameId,
        state: initialState,
        playerOrder: ["player-1", "player-2"],
        deckCardIdsByTier: {},
      },
    ]);
    const service = new GameCommandService({ repository });

    const idempotencyKey = "same-idempotency-key";
    const firstCommand = buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        gameId: initialState.gameId,
        actorId: "player-1",
        expectedVersion: initialState.version,
        idempotencyKey,
      },
    );
    const secondCommand = buildTakeTokensCommand(
      {
        tokens: { ruby: 1, emerald: 1, sapphire: 1 },
      },
      {
        gameId: initialState.gameId,
        actorId: "player-1",
        expectedVersion: initialState.version,
        idempotencyKey,
      },
    );

    const accepted = await service.handle(firstCommand);
    expect(accepted.kind).toBe("accepted");

    const rejected = await service.handle(secondCommand);
    expect(rejected).toMatchObject({
      kind: "rejected",
      reason: "IDEMPOTENCY_PAYLOAD_MISMATCH",
      retryable: false,
    });
    expect(repository.persistCallCount).toBe(1);
  });

  it.each(buildServiceRejectionScenarios())(
    "$name",
    async ({ seedContexts, command, expected }) => {
      const repository = new FakeGameCommandRepository(seedContexts);
      const service = new GameCommandService({ repository });

      const result = await service.handle(command);

      expect(result).toMatchObject({
        kind: "rejected",
        reason: expected.reason,
        retryable: expected.retryable,
        policyCode: expected.policyCode,
        details: expected.details,
      });
      expect(repository.persistCallCount).toBe(0);
    },
  );

  it.each(gameServerScenarios.map((scenario) => [scenario.name, scenario] as const))(
    "%s 시나리오 기대 결과를 만족한다",
    async (_, scenario) => {
      if (scenario.expected.layer !== "GAME_SERVER") {
        throw new Error(`GAME_SERVER expected layer mismatch: ${scenario.name}`);
      }

      const repository = new FakeGameCommandRepository([
        {
          gameId: scenario.initialState.gameId,
          state: scenario.initialState,
          playerOrder: scenario.playerOrder,
          deckCardIdsByTier: scenario.deckCardIdsByTier ?? {},
        },
      ]);
      const service = new GameCommandService({ repository });
      const commands = getScenarioCommands(scenario);

      const results = [];
      for (const command of commands) {
        results.push(await service.handle(command));
      }

      expect(results.length).toBe(scenario.expected.steps.length);
      for (const [index, result] of results.entries()) {
        const expectedStep = scenario.expected.steps[index];
        if (!expectedStep) {
          throw new Error(`expected step is missing: ${scenario.name}:${index}`);
        }

        expect(result.kind).toBe(expectedStep.kind);
        if (expectedStep.kind === "rejected") {
          expect(result).toMatchObject({
            kind: "rejected",
            reason: expectedStep.reason,
          });
        }
      }

      const finalContext = await repository.loadGameCommandContext(
        scenario.initialState.gameId,
      );
      if (!finalContext) {
        throw new Error(`final context is missing: ${scenario.name}`);
      }

      expect(finalContext.state.version).toBe(scenario.expected.finalState.version);
      expect(finalContext.state.status).toBe(scenario.expected.finalState.status);
      expect(finalContext.state.currentPlayerId).toBe(
        scenario.expected.finalState.currentPlayerId,
      );
      expect(finalContext.state.winnerPlayerIds).toEqual(
        scenario.expected.finalState.winnerPlayerIds,
      );
      for (const [playerId, snapshot] of Object.entries(
        scenario.expected.finalState.playerSnapshots,
      )) {
        const player = finalContext.state.players[playerId];
        if (!player) {
          throw new Error(`player is missing in final state: ${scenario.name}:${playerId}`);
        }

        expect(countWallet(player.tokens)).toBe(snapshot.tokenCount);
        expect(countWallet(player.bonuses)).toBe(snapshot.bonusCount);
        expect(player.reservedCardIds.length).toBe(snapshot.reservedCardCount);
      }
      expect(repository.persistCallCount).toBe(scenario.expected.persistCallCount);
    },
  );
});

function getScenarioCommands(scenario: SplendorScenario): readonly Command[] {
  switch (scenario.kind) {
    case "single-command":
      return [scenario.command];
    case "command-sequence":
      return scenario.commands;
    default:
      return assertNever(scenario);
  }
}

function assertNever(value: never): never {
  throw new Error(`알 수 없는 시나리오 종류: ${String(value)}`);
}

function countWallet(wallet: Record<string, number>): number {
  return Object.values(wallet).reduce((sum, value) => sum + value, 0);
}

interface ServiceRejectionScenario {
  name: string;
  seedContexts: readonly SeedContextInput[];
  command: Command;
  expected: {
    reason: GameCommandRejectedReason;
    retryable: boolean;
    policyCode?: string;
    details?: string;
  };
}

function buildServiceRejectionScenarios(): readonly ServiceRejectionScenario[] {
  const waitingState = buildGameState({
    status: "WAITING",
  });
  const malformedReserveState = buildGameState();
  const mismatchedState = buildGameState({
    gameId: "game-state-internal",
  });

  return [
    {
      name: "상태가 없으면 STATE_NOT_FOUND로 거절한다",
      seedContexts: [],
      command: buildTakeTokensCommand(
        {
          tokens: { diamond: 1, sapphire: 1, emerald: 1 },
        },
        {
          gameId: "game-missing",
          actorId: "player-1",
          expectedVersion: 0,
          idempotencyKey: "missing-state",
        },
      ),
      expected: {
        reason: "STATE_NOT_FOUND",
        retryable: false,
        details: "GAME_CONTEXT_NOT_FOUND",
      },
    },
    {
      name: "잘못된 엔벌로프는 COMMAND_ENVELOPE_INVALID로 거절한다",
      seedContexts: [
        {
          gameId: malformedReserveState.gameId,
          state: malformedReserveState,
          playerOrder: ["player-1", "player-2"],
          deckCardIdsByTier: {},
        },
      ],
      command: {
        type: "RESERVE_CARD",
        gameId: malformedReserveState.gameId,
        actorId: "player-1",
        expectedVersion: malformedReserveState.version,
        idempotencyKey: "invalid-reserve-target",
        payload: {
          takeGoldToken: true,
        },
      } as unknown as Command,
      expected: {
        reason: "COMMAND_ENVELOPE_INVALID",
        retryable: false,
        details: "INVALID_PAYLOAD_RESERVE_CARD",
      },
    },
    {
      name: "게임이 진행중이 아니면 STATE_NOT_ACTIVE로 거절한다",
      seedContexts: [
        {
          gameId: waitingState.gameId,
          state: waitingState,
          playerOrder: ["player-1", "player-2"],
          deckCardIdsByTier: {},
        },
      ],
      command: buildTakeTokensCommand(
        {
          tokens: { diamond: 1, sapphire: 1, emerald: 1 },
        },
        {
          gameId: waitingState.gameId,
          actorId: "player-1",
          expectedVersion: waitingState.version,
          idempotencyKey: "waiting-state",
        },
      ),
      expected: {
        reason: "STATE_NOT_ACTIVE",
        retryable: false,
        details: "STATE_NOT_IN_PROGRESS",
      },
    },
    {
      name: "상태 gameId 불일치는 STATE_INVARIANT_BROKEN으로 거절한다",
      seedContexts: [
        {
          gameId: "game-context-public",
          state: mismatchedState,
          playerOrder: ["player-1", "player-2"],
          deckCardIdsByTier: {},
        },
      ],
      command: buildTakeTokensCommand(
        {
          tokens: { ruby: 1, emerald: 1, sapphire: 1 },
        },
        {
          gameId: "game-context-public",
          actorId: "player-1",
          expectedVersion: mismatchedState.version,
          idempotencyKey: "game-id-mismatch",
        },
      ),
      expected: {
        reason: "STATE_INVARIANT_BROKEN",
        retryable: false,
        details: "GAME_ID_MISMATCH",
      },
    },
  ] as const;
}

interface SeedContextInput extends GameCommandContext {
  gameId: string;
}

class FakeGameCommandRepository implements GameCommandRepositoryPort {
  readonly #contexts = new Map<string, GameCommandContext>();
  readonly #stored = new Map<string, Map<string, StoredCommandSuccessRecord>>();
  persistCallCount = 0;
  shouldFailPersist = false;

  constructor(seedContexts: readonly SeedContextInput[]) {
    for (const context of seedContexts) {
      this.#contexts.set(context.gameId, {
        state: cloneState(context.state),
        playerOrder: [...context.playerOrder],
        deckCardIdsByTier: cloneDeckContext(context.deckCardIdsByTier),
      });
    }
  }

  async loadGameCommandContext(gameId: string): Promise<GameCommandContext | null> {
    const context = this.#contexts.get(gameId);
    if (!context) {
      return null;
    }

    return {
      state: cloneState(context.state),
      playerOrder: [...context.playerOrder],
      deckCardIdsByTier: cloneDeckContext(context.deckCardIdsByTier),
    };
  }

  async loadStoredCommandSuccess(
    gameId: string,
    idempotencyKey: string,
  ): Promise<StoredCommandSuccessRecord | null> {
    const gameStore = this.#stored.get(gameId);
    const record = gameStore?.get(idempotencyKey);
    if (!record) {
      return null;
    }

    return {
      ...record,
      events: cloneEvents(record.events),
      nextState: cloneState(record.nextState),
    };
  }

  async persistCommandSuccess(input: PersistCommandSuccessInput): Promise<void> {
    this.persistCallCount += 1;
    if (this.shouldFailPersist) {
      throw new Error("PERSISTENCE_FAILURE_FOR_TEST");
    }

    const gameId = input.command.gameId;
    const existingContext = this.#contexts.get(gameId);

    this.#contexts.set(gameId, {
      state: cloneState(input.nextState),
      playerOrder: existingContext
        ? [...existingContext.playerOrder]
        : Object.keys(input.nextState.players),
      deckCardIdsByTier: existingContext
        ? cloneDeckContext(existingContext.deckCardIdsByTier)
        : {},
    });

    let gameStore = this.#stored.get(gameId);
    if (!gameStore) {
      gameStore = new Map<string, StoredCommandSuccessRecord>();
      this.#stored.set(gameId, gameStore);
    }

    gameStore.set(input.command.idempotencyKey, {
      gameId,
      idempotencyKey: input.command.idempotencyKey,
      commandFingerprint: input.commandFingerprint,
      events: cloneEvents(input.events),
      nextState: cloneState(input.nextState),
    });
  }
}

function cloneEvents(events: readonly GameEvent[]): GameEvent[] {
  return structuredClone(events) as GameEvent[];
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function cloneDeckContext(
  input: Partial<Record<DeckTier, readonly string[]>>,
): Partial<Record<DeckTier, readonly string[]>> {
  const cloned: Partial<Record<DeckTier, readonly string[]>> = {};
  for (const tier of [1, 2, 3] as const) {
    const deckIds = input[tier];
    if (deckIds) {
      cloned[tier] = [...deckIds];
    }
  }
  return cloned;
}
