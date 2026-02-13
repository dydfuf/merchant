export interface GameServerEnv {
  host: string;
  port: number;
  mode: "local-inmemory";
}

export function readGameServerEnv(
  source: Record<string, string | undefined> = process.env,
): GameServerEnv {
  const host = source.GAME_SERVER_HOST?.trim() || "127.0.0.1";
  const port = parsePort(source.GAME_SERVER_PORT, 4010);

  return {
    host,
    port,
    mode: "local-inmemory",
  };
}

function parsePort(value: string | undefined, defaultPort: number): number {
  if (!value || value.trim().length === 0) {
    return defaultPort;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`INVALID_GAME_SERVER_PORT:${value}`);
  }

  return parsed;
}
