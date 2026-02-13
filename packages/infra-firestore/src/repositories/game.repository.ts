import type { DeckTier, GameId, GameState } from "@repo/shared-types";

export interface StoredGameSnapshot {
  gameId: GameId;
  state: GameState;
  playerOrder: readonly string[];
  deckCardIdsByTier: Partial<Record<DeckTier, readonly string[]>>;
}

export interface GameRepository {
  create(snapshot: StoredGameSnapshot): Promise<void>;
  load(gameId: GameId): Promise<StoredGameSnapshot | null>;
  save(snapshot: StoredGameSnapshot): Promise<void>;
}

export class InMemoryGameRepository implements GameRepository {
  readonly #snapshots = new Map<GameId, StoredGameSnapshot>();

  async create(snapshot: StoredGameSnapshot): Promise<void> {
    if (this.#snapshots.has(snapshot.gameId)) {
      throw new Error(`GAME_ALREADY_EXISTS:${snapshot.gameId}`);
    }

    this.#snapshots.set(snapshot.gameId, cloneSnapshot(snapshot));
  }

  async load(gameId: GameId): Promise<StoredGameSnapshot | null> {
    const snapshot = this.#snapshots.get(gameId);
    if (!snapshot) {
      return null;
    }

    return cloneSnapshot(snapshot);
  }

  async save(snapshot: StoredGameSnapshot): Promise<void> {
    this.#snapshots.set(snapshot.gameId, cloneSnapshot(snapshot));
  }
}

function cloneSnapshot(snapshot: StoredGameSnapshot): StoredGameSnapshot {
  return {
    gameId: snapshot.gameId,
    state: structuredClone(snapshot.state),
    playerOrder: [...snapshot.playerOrder],
    deckCardIdsByTier: cloneDeckContext(snapshot.deckCardIdsByTier),
  };
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
