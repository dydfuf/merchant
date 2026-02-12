import type { GameCommandRepositoryPort } from "../application/commands/command-handler.port.js";
import { CommandDispatcherService } from "../application/commands/command-dispatcher.service.js";
import { GameCommandService } from "../application/services/game-command.service.js";
import { createConsoleLogger, type Logger } from "../infrastructure/logger/logger.js";
import {
  InMemoryGameCommandRepository,
  type SeedGameContextInput,
} from "../infrastructure/repositories/in-memory-command-handler.repo.js";
import { GameGateway } from "../presentation/ws/game.gateway.js";

export interface BootstrapAppInput {
  repository?: GameCommandRepositoryPort;
  logger?: Logger;
  initialContexts?: readonly SeedGameContextInput[];
}

export interface BootstrappedGameServer {
  repository: GameCommandRepositoryPort;
  logger: Logger;
  gameCommandService: GameCommandService;
  commandDispatcher: CommandDispatcherService;
  gameGateway: GameGateway;
}

export function bootstrapApp(input: BootstrapAppInput = {}): BootstrappedGameServer {
  const repository =
    input.repository ?? createDefaultRepository(input.initialContexts ?? []);
  const logger = input.logger ?? createConsoleLogger();

  const gameCommandService = new GameCommandService({
    repository,
    logger,
  });
  const commandDispatcher = new CommandDispatcherService({
    handler: gameCommandService,
  });
  const gameGateway = new GameGateway({
    dispatcher: commandDispatcher,
    logger,
  });

  return {
    repository,
    logger,
    gameCommandService,
    commandDispatcher,
    gameGateway,
  };
}

function createDefaultRepository(
  initialContexts: readonly SeedGameContextInput[],
): InMemoryGameCommandRepository {
  const repository = new InMemoryGameCommandRepository();
  for (const context of initialContexts) {
    repository.seedGameContext(context);
  }
  return repository;
}
