import type { GameEvent, GameId, GameState } from "@repo/shared-types";

export interface StoredCommandSuccess {
  gameId: GameId;
  idempotencyKey: string;
  commandFingerprint: string;
  events: GameEvent[];
  nextState: GameState;
}

export interface CommandRepository {
  loadSuccess(
    gameId: GameId,
    idempotencyKey: string,
  ): Promise<StoredCommandSuccess | null>;
  saveSuccess(record: StoredCommandSuccess): Promise<void>;
}

export class InMemoryCommandRepository implements CommandRepository {
  readonly #records = new Map<GameId, Map<string, StoredCommandSuccess>>();

  async loadSuccess(
    gameId: GameId,
    idempotencyKey: string,
  ): Promise<StoredCommandSuccess | null> {
    const gameRecords = this.#records.get(gameId);
    const record = gameRecords?.get(idempotencyKey);
    if (!record) {
      return null;
    }

    return cloneRecord(record);
  }

  async saveSuccess(record: StoredCommandSuccess): Promise<void> {
    let gameRecords = this.#records.get(record.gameId);
    if (!gameRecords) {
      gameRecords = new Map<string, StoredCommandSuccess>();
      this.#records.set(record.gameId, gameRecords);
    }

    gameRecords.set(record.idempotencyKey, cloneRecord(record));
  }
}

function cloneRecord(record: StoredCommandSuccess): StoredCommandSuccess {
  return {
    gameId: record.gameId,
    idempotencyKey: record.idempotencyKey,
    commandFingerprint: record.commandFingerprint,
    events: structuredClone(record.events),
    nextState: structuredClone(record.nextState),
  };
}
