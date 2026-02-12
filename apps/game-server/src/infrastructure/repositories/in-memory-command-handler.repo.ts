import type { DeckTier, GameEvent, GameId, GameState } from "@repo/shared-types";

import type {
  GameCommandContext,
  GameCommandRepositoryPort,
  PersistCommandSuccessInput,
  StoredCommandSuccessRecord,
} from "../../application/commands/command-handler.port.js";

export interface SeedGameContextInput extends GameCommandContext {
  gameId: GameId;
}

export class InMemoryGameCommandRepository implements GameCommandRepositoryPort {
  readonly #contexts = new Map<GameId, GameCommandContext>();
  readonly #storedCommands = new Map<GameId, Map<string, StoredCommandSuccessRecord>>();
  #persistFailure: Error | null = null;

  seedGameContext(input: SeedGameContextInput): void {
    this.#contexts.set(input.gameId, {
      state: cloneState(input.state),
      playerOrder: [...input.playerOrder],
      deckCardIdsByTier: cloneDeckContext(input.deckCardIdsByTier),
    });
  }

  setPersistFailure(error: Error | null): void {
    this.#persistFailure = error;
  }

  async loadGameCommandContext(gameId: GameId): Promise<GameCommandContext | null> {
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
    gameId: GameId,
    idempotencyKey: string,
  ): Promise<StoredCommandSuccessRecord | null> {
    const gameCommands = this.#storedCommands.get(gameId);
    const record = gameCommands?.get(idempotencyKey);
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
    if (this.#persistFailure) {
      throw this.#persistFailure;
    }

    const gameId = input.command.gameId;
    const existingContext = this.#contexts.get(gameId);
    const nextContext: GameCommandContext = {
      state: cloneState(input.nextState),
      playerOrder: existingContext
        ? [...existingContext.playerOrder]
        : Object.keys(input.nextState.players),
      deckCardIdsByTier: existingContext
        ? cloneDeckContext(existingContext.deckCardIdsByTier)
        : {},
    };

    this.#contexts.set(gameId, nextContext);

    let gameCommands = this.#storedCommands.get(gameId);
    if (!gameCommands) {
      gameCommands = new Map<string, StoredCommandSuccessRecord>();
      this.#storedCommands.set(gameId, gameCommands);
    }

    gameCommands.set(input.command.idempotencyKey, {
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
