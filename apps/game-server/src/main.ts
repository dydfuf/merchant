import { readGameServerEnv } from "./bootstrap/env.js";
import { createConsoleLogger } from "./infrastructure/logger/logger.js";
import { createLocalGameServer } from "./runtime/local-server.js";

const logger = createConsoleLogger("game-server-main");

async function main(): Promise<void> {
  const env = readGameServerEnv();
  const server = createLocalGameServer({
    host: env.host,
    port: env.port,
    logger,
  });

  await server.start();

  logger.info("server ready", {
    mode: env.mode,
    httpUrl: server.httpUrl,
    wsUrl: `${server.wsUrl}/ws`,
  });

  let stopping = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) {
      return;
    }

    stopping = true;
    logger.info("shutting down", { signal });

    try {
      await server.stop();
      logger.info("shutdown complete", { signal });
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "STOP_FAILED";
      logger.error("shutdown failed", { signal, message });
      process.exit(1);
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "STARTUP_FAILED";
  logger.error("startup failed", { message });
  process.exit(1);
});
