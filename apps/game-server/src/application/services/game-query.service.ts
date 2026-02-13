import type { GameId, GameState } from "@repo/shared-types";

import type { GameCommandContext } from "../commands/command-handler.port.js";

export interface GameQueryRepositoryPort {
  loadGameCommandContext(gameId: GameId): Promise<GameCommandContext | null>;
}

export interface GameQueryServiceDependencies {
  repository: GameQueryRepositoryPort;
}

export class GameQueryService {
  readonly #repository: GameQueryRepositoryPort;

  constructor(dependencies: GameQueryServiceDependencies) {
    this.#repository = dependencies.repository;
  }

  async getGameContext(gameId: GameId): Promise<GameCommandContext | null> {
    const context = await this.#repository.loadGameCommandContext(gameId);
    if (!context) {
      return null;
    }

    return {
      state: structuredClone(context.state),
      playerOrder: [...context.playerOrder],
      deckCardIdsByTier: structuredClone(context.deckCardIdsByTier),
    };
  }

  async getGameState(gameId: GameId): Promise<GameState | null> {
    const context = await this.getGameContext(gameId);
    return context ? context.state : null;
  }
}
