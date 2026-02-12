import type { Command } from "@repo/shared-types";

import type {
  GameCommandServiceResult,
} from "../services/game-command.service.js";

export interface GameCommandHandler {
  handle(command: Command): Promise<GameCommandServiceResult>;
}

export interface CommandDispatcherServiceDependencies {
  handler: GameCommandHandler;
}

export class CommandDispatcherService {
  readonly #handler: GameCommandHandler;

  constructor(dependencies: CommandDispatcherServiceDependencies) {
    this.#handler = dependencies.handler;
  }

  async dispatch(command: Command): Promise<GameCommandServiceResult> {
    return this.#handler.handle(command);
  }
}
