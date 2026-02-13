import type { GameEvent, GameId } from "@repo/shared-types";

export interface EventRepository {
  append(gameId: GameId, events: readonly GameEvent[]): Promise<void>;
  list(gameId: GameId): Promise<GameEvent[]>;
}

export class InMemoryEventRepository implements EventRepository {
  readonly #eventsByGame = new Map<GameId, GameEvent[]>();

  async append(gameId: GameId, events: readonly GameEvent[]): Promise<void> {
    const current = this.#eventsByGame.get(gameId) ?? [];
    current.push(...structuredClone(events));
    this.#eventsByGame.set(gameId, current);
  }

  async list(gameId: GameId): Promise<GameEvent[]> {
    const events = this.#eventsByGame.get(gameId) ?? [];
    return structuredClone(events);
  }
}
