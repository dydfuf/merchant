import { CommandDispatcherService } from "../../application/commands/command-dispatcher.service.js";
import type {
  GameGatewayResponse,
  HandleGameCommandInput,
} from "./ws.types.js";

export interface GameGatewayLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
}

export interface GameGatewayDependencies {
  dispatcher: CommandDispatcherService;
  logger?: GameGatewayLogger;
}

const NOOP_LOGGER: GameGatewayLogger = {
  info: () => undefined,
  warn: () => undefined,
};

export class GameGateway {
  readonly #dispatcher: CommandDispatcherService;
  readonly #logger: GameGatewayLogger;

  constructor(dependencies: GameGatewayDependencies) {
    this.#dispatcher = dependencies.dispatcher;
    this.#logger = dependencies.logger ?? NOOP_LOGGER;
  }

  async handleCommand(input: HandleGameCommandInput): Promise<GameGatewayResponse> {
    if (input.auth.userId !== input.command.actorId) {
      this.#logger.warn("command rejected due to actor/auth mismatch", {
        actorId: input.command.actorId,
        authUserId: input.auth.userId,
        gameId: input.command.gameId,
      });
      return {
        ok: false,
        reason: "UNAUTHORIZED_ACTOR",
        message: "actorId must match authenticated user",
      };
    }

    const result = await this.#dispatcher.dispatch(input.command);
    this.#logger.info("command handled through gateway", {
      gameId: input.command.gameId,
      commandType: input.command.type,
      resultKind: result.kind,
    });
    return {
      ok: true,
      result,
    };
  }
}
