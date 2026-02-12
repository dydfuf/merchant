import {
  applyCommand,
  type ApplyCommandResult,
  type PolicyErrorCode,
} from "@repo/rule-engine";
import type { Command, GameEvent, GameState } from "@repo/shared-types";

import type {
  GameCommandRepositoryPort,
  StoredCommandSuccessRecord,
} from "../commands/command-handler.port.js";
import { evaluateIdempotencyKey } from "../policies/idempotency.policy.js";
import { isVersionConflict } from "../policies/version-conflict.policy.js";

export type GameCommandRejectedReason =
  | "MISSING_IDEMPOTENCY_KEY"
  | "IDEMPOTENCY_PAYLOAD_MISMATCH"
  | "STATE_NOT_FOUND"
  | "VERSION_CONFLICT"
  | "POLICY_VIOLATION"
  | "ENGINE_FAILURE"
  | "INFRA_FAILURE";

export interface GameCommandAcceptedResult {
  kind: "accepted";
  replayed: false;
  events: GameEvent[];
  nextState: GameState;
}

export interface GameCommandReplayedResult {
  kind: "replayed";
  replayed: true;
  events: GameEvent[];
  nextState: GameState;
}

export interface GameCommandRejectedResult {
  kind: "rejected";
  replayed: false;
  reason: GameCommandRejectedReason;
  retryable: boolean;
  policyCode?: PolicyErrorCode;
  details?: string;
}

export type GameCommandServiceResult =
  | GameCommandAcceptedResult
  | GameCommandReplayedResult
  | GameCommandRejectedResult;

export interface GameCommandServiceLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface GameCommandServiceDependencies {
  repository: GameCommandRepositoryPort;
  logger?: GameCommandServiceLogger;
}

const NOOP_LOGGER: GameCommandServiceLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

type ApplyCommandFailure = Extract<ApplyCommandResult, { ok: false }>;

export class GameCommandService {
  readonly #repository: GameCommandRepositoryPort;
  readonly #logger: GameCommandServiceLogger;

  constructor(dependencies: GameCommandServiceDependencies) {
    this.#repository = dependencies.repository;
    this.#logger = dependencies.logger ?? NOOP_LOGGER;
  }

  async handle(command: Command): Promise<GameCommandServiceResult> {
    const commandFingerprint = createCommandFingerprint(command);
    const storedCommand = await this.#repository.loadStoredCommandSuccess(
      command.gameId,
      command.idempotencyKey,
    );

    const idempotencyDecision = evaluateIdempotencyKey(
      storedCommand
        ? new Set<string>([storedCommand.idempotencyKey])
        : new Set<string>(),
      command.idempotencyKey,
    );

    if (idempotencyDecision === "reject_missing") {
      return reject("MISSING_IDEMPOTENCY_KEY", false);
    }

    if (idempotencyDecision === "reject_duplicate") {
      return this.#handleDuplicateCommand(storedCommand, commandFingerprint);
    }

    const context = await this.#repository.loadGameCommandContext(command.gameId);
    if (!context) {
      return reject("STATE_NOT_FOUND", false, undefined, "GAME_CONTEXT_NOT_FOUND");
    }

    if (
      isVersionConflict({
        expectedVersion: command.expectedVersion,
        actualVersion: context.state.version,
      })
    ) {
      return reject("VERSION_CONFLICT", false, undefined, "EXPECTED_VERSION_MISMATCH");
    }

    const engineResult = applyCommand({
      state: context.state,
      command,
      playerOrder: context.playerOrder,
      deckCardIdsByTier: context.deckCardIdsByTier,
    });

    if (!engineResult.ok) {
      return this.#mapEngineFailure(engineResult);
    }

    try {
      await this.#repository.persistCommandSuccess({
        command,
        commandFingerprint,
        events: engineResult.events,
        nextState: engineResult.nextState,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "PERSISTENCE_FAILED";
      this.#logger.error("command persist failed", {
        gameId: command.gameId,
        idempotencyKey: command.idempotencyKey,
        message,
      });
      return reject("INFRA_FAILURE", true, undefined, message);
    }

    this.#logger.info("command accepted", {
      gameId: command.gameId,
      commandType: command.type,
      nextVersion: engineResult.nextState.version,
    });

    return {
      kind: "accepted",
      replayed: false,
      events: cloneEvents(engineResult.events),
      nextState: cloneState(engineResult.nextState),
    };
  }

  #handleDuplicateCommand(
    storedCommand: StoredCommandSuccessRecord | null,
    commandFingerprint: string,
  ): GameCommandServiceResult {
    if (!storedCommand) {
      return reject(
        "INFRA_FAILURE",
        true,
        undefined,
        "IDEMPOTENCY_RECORD_MISSING",
      );
    }

    if (storedCommand.commandFingerprint !== commandFingerprint) {
      return reject("IDEMPOTENCY_PAYLOAD_MISMATCH", false);
    }

    this.#logger.info("command replayed", {
      gameId: storedCommand.gameId,
      idempotencyKey: storedCommand.idempotencyKey,
    });

    return {
      kind: "replayed",
      replayed: true,
      events: cloneEvents(storedCommand.events),
      nextState: cloneState(storedCommand.nextState),
    };
  }

  #mapEngineFailure(result: ApplyCommandFailure): GameCommandServiceResult {
    if (result.code === "POLICY_VIOLATION") {
      return reject("POLICY_VIOLATION", false, result.policyCode, result.reason);
    }

    return reject("ENGINE_FAILURE", false, undefined, `${result.code}:${result.reason ?? ""}`);
  }
}

function reject(
  reason: GameCommandRejectedReason,
  retryable: boolean,
  policyCode?: PolicyErrorCode,
  details?: string,
): GameCommandRejectedResult {
  return {
    kind: "rejected",
    replayed: false,
    reason,
    retryable,
    policyCode,
    details,
  };
}

function createCommandFingerprint(command: Command): string {
  return JSON.stringify(toCanonicalValue(command));
}

function toCanonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => toCanonicalValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, toCanonicalValue(nestedValue)]),
    );
  }

  return value;
}

function cloneEvents(events: readonly GameEvent[]): GameEvent[] {
  return structuredClone(events) as GameEvent[];
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}
