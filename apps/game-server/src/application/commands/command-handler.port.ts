import type {
  Command,
  DeckTier,
  GameEvent,
  GameId,
  GameState,
} from "@repo/shared-types";

export interface GameCommandContext {
  state: GameState;
  playerOrder: readonly string[];
  deckCardIdsByTier: Partial<Record<DeckTier, readonly string[]>>;
}

export interface StoredCommandSuccessRecord {
  gameId: GameId;
  idempotencyKey: string;
  commandFingerprint: string;
  events: GameEvent[];
  nextState: GameState;
}

export interface PersistCommandSuccessInput {
  command: Command;
  commandFingerprint: string;
  events: GameEvent[];
  nextState: GameState;
}

export interface GameCommandRepositoryPort {
  loadGameCommandContext(gameId: GameId): Promise<GameCommandContext | null>;
  loadStoredCommandSuccess(
    gameId: GameId,
    idempotencyKey: string,
  ): Promise<StoredCommandSuccessRecord | null>;
  persistCommandSuccess(input: PersistCommandSuccessInput): Promise<void>;
}
