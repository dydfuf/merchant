import type { GameId } from "@repo/shared-types";

export type GameTransactionOperation<TResult> = () => Promise<TResult>;

export interface GameTransactionRunner {
  run<TResult>(
    gameId: GameId,
    operation: GameTransactionOperation<TResult>,
  ): Promise<TResult>;
}

export class InMemoryGameTransactionRunner implements GameTransactionRunner {
  readonly #locks = new Map<GameId, Promise<void>>();

  async run<TResult>(
    gameId: GameId,
    operation: GameTransactionOperation<TResult>,
  ): Promise<TResult> {
    const previous = this.#locks.get(gameId) ?? Promise.resolve();

    let releaseCurrent: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    const queued = previous.then(() => current);

    this.#locks.set(gameId, queued);

    await previous;

    try {
      return await operation();
    } finally {
      releaseCurrent();
      if (this.#locks.get(gameId) === queued) {
        this.#locks.delete(gameId);
      }
    }
  }
}

export function withGameTransaction<TResult>(
  runner: GameTransactionRunner,
  gameId: GameId,
  operation: GameTransactionOperation<TResult>,
): Promise<TResult> {
  return runner.run(gameId, operation);
}
