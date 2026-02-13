import {
  InMemoryCommandRepository,
  InMemoryEventRepository,
  InMemoryGameRepository,
  InMemoryGameTransactionRunner,
  withGameTransaction,
} from "@repo/infra-firestore";
import type { DeckTier, GameEvent, GameId, GameState } from "@repo/shared-types";

import type {
  GameCommandContext,
  GameCommandRepositoryPort,
  PersistCommandSuccessInput,
  StoredCommandSuccessRecord,
} from "../../application/commands/command-handler.port.js";
import type { SeedGameContextInput } from "./in-memory-command-handler.repo.js";

export interface LocalGameStateUpdate {
  gameId: GameId;
  events: GameEvent[];
  state: GameState;
}

export type LocalGameStateListener = (update: LocalGameStateUpdate) => void;

export class LocalGameRegistryRepository implements GameCommandRepositoryPort {
  readonly #gameRepository = new InMemoryGameRepository();
  readonly #commandRepository = new InMemoryCommandRepository();
  readonly #eventRepository = new InMemoryEventRepository();
  readonly #transactionRunner = new InMemoryGameTransactionRunner();
  readonly #listeners = new Map<GameId, Set<LocalGameStateListener>>();

  async createGame(input: SeedGameContextInput): Promise<void> {
    await this.#gameRepository.create({
      gameId: input.gameId,
      state: cloneState(input.state),
      playerOrder: [...input.playerOrder],
      deckCardIdsByTier: cloneDeckContext(input.deckCardIdsByTier),
    });
  }

  async loadGameCommandContext(gameId: GameId): Promise<GameCommandContext | null> {
    const snapshot = await this.#gameRepository.load(gameId);
    if (!snapshot) {
      return null;
    }

    return {
      state: cloneState(snapshot.state),
      playerOrder: [...snapshot.playerOrder],
      deckCardIdsByTier: cloneDeckContext(snapshot.deckCardIdsByTier),
    };
  }

  async loadStoredCommandSuccess(
    gameId: GameId,
    idempotencyKey: string,
  ): Promise<StoredCommandSuccessRecord | null> {
    const record = await this.#commandRepository.loadSuccess(gameId, idempotencyKey);
    if (!record) {
      return null;
    }

    return {
      gameId: record.gameId,
      idempotencyKey: record.idempotencyKey,
      commandFingerprint: record.commandFingerprint,
      events: cloneEvents(record.events),
      nextState: cloneState(record.nextState),
    };
  }

  async persistCommandSuccess(input: PersistCommandSuccessInput): Promise<void> {
    const update = await withGameTransaction(
      this.#transactionRunner,
      input.command.gameId,
      async (): Promise<LocalGameStateUpdate> => {
        const snapshot = await this.#gameRepository.load(input.command.gameId);
        if (!snapshot) {
          throw new Error("GAME_CONTEXT_NOT_FOUND");
        }

        await this.#commandRepository.saveSuccess({
          gameId: input.command.gameId,
          idempotencyKey: input.command.idempotencyKey,
          commandFingerprint: input.commandFingerprint,
          events: cloneEvents(input.events),
          nextState: cloneState(input.nextState),
        });

        await this.#eventRepository.append(input.command.gameId, input.events);

        await this.#gameRepository.save({
          gameId: snapshot.gameId,
          state: cloneState(input.nextState),
          playerOrder: [...snapshot.playerOrder],
          deckCardIdsByTier: cloneDeckContext(snapshot.deckCardIdsByTier),
        });

        return {
          gameId: input.command.gameId,
          events: cloneEvents(input.events),
          state: cloneState(input.nextState),
        };
      },
    );

    this.#publish(update);
  }

  async loadGameState(gameId: GameId): Promise<GameState | null> {
    const snapshot = await this.#gameRepository.load(gameId);
    return snapshot ? cloneState(snapshot.state) : null;
  }

  async loadGameEvents(gameId: GameId): Promise<GameEvent[]> {
    return this.#eventRepository.list(gameId);
  }

  subscribe(gameId: GameId, listener: LocalGameStateListener): () => void {
    let listeners = this.#listeners.get(gameId);
    if (!listeners) {
      listeners = new Set<LocalGameStateListener>();
      this.#listeners.set(gameId, listeners);
    }

    listeners.add(listener);

    return () => {
      const targetListeners = this.#listeners.get(gameId);
      if (!targetListeners) {
        return;
      }

      targetListeners.delete(listener);
      if (targetListeners.size === 0) {
        this.#listeners.delete(gameId);
      }
    };
  }

  #publish(update: LocalGameStateUpdate): void {
    const listeners = this.#listeners.get(update.gameId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of listeners) {
      listener({
        gameId: update.gameId,
        events: cloneEvents(update.events),
        state: cloneState(update.state),
      });
    }
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
    const cardIds = input[tier];
    if (cardIds) {
      cloned[tier] = [...cardIds];
    }
  }

  return cloned;
}
