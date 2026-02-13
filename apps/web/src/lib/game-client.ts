import type { Command, GameState } from "@repo/shared-types";

export interface CreateGameInput {
  playerIds?: string[];
  seed?: string;
}

export interface CreateGameResponse {
  gameId: string;
  state: GameState;
  playerOrder: string[];
}

export interface GetGameResponse {
  gameId: string;
  state: GameState;
  playerOrder: string[];
}

export type GatewayCommandResponse =
  | {
      ok: true;
      result: {
        kind: string;
        replayed: boolean;
        nextState?: GameState;
        reason?: string;
        details?: string;
      };
    }
  | {
      ok: false;
      reason: string;
      message: string;
    };

export type GameSocketMessage =
  | {
      type: "GAME_SNAPSHOT";
      gameId: string;
      payload: {
        state: GameState;
      };
    }
  | {
      type: "GAME_EVENTS";
      gameId: string;
      payload: {
        events: unknown[];
      };
    }
  | {
      type: "COMMAND_RESULT";
      gameId: string;
      payload: unknown;
    }
  | {
      type: "ERROR";
      gameId?: string;
      payload: {
        code: string;
        message: string;
      };
    };

export interface ConnectSocketInput {
  userId: string;
  onMessage(message: GameSocketMessage): void;
  onOpen?(): void;
  onClose?(): void;
  onError?(error: string): void;
}

export interface GameSocketHandle {
  subscribe(gameId: string): void;
  unsubscribe(gameId: string): void;
  close(): void;
}

export function resolveGameServerUrl(): string {
  const raw = process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim();
  if (!raw) {
    return "http://127.0.0.1:4010";
  }

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function resolveGameServerWsUrl(): string {
  const httpUrl = resolveGameServerUrl();
  if (httpUrl.startsWith("https://")) {
    return `wss://${httpUrl.slice("https://".length)}`;
  }

  if (httpUrl.startsWith("http://")) {
    return `ws://${httpUrl.slice("http://".length)}`;
  }

  return `ws://${httpUrl}`;
}

export async function createGame(
  input: CreateGameInput,
): Promise<CreateGameResponse> {
  const response = await fetch(`${resolveGameServerUrl()}/local/games`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`GAME_CREATE_FAILED:${message}`);
  }

  return (await response.json()) as CreateGameResponse;
}

export async function getGame(gameId: string): Promise<GetGameResponse> {
  const response = await fetch(`${resolveGameServerUrl()}/local/games/${gameId}`);

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`GAME_LOAD_FAILED:${message}`);
  }

  return (await response.json()) as GetGameResponse;
}

export async function sendCommand(
  gameId: string,
  command: Command,
  userId: string,
): Promise<GatewayCommandResponse> {
  const response = await fetch(
    `${resolveGameServerUrl()}/local/games/${gameId}/commands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ command }),
    },
  );

  const payload = (await response.json()) as GatewayCommandResponse;
  return payload;
}

export function connectGameSocket(input: ConnectSocketInput): GameSocketHandle {
  const url = `${resolveGameServerWsUrl()}/ws?userId=${encodeURIComponent(input.userId)}`;
  const socket = new WebSocket(url);
  const queuedPayloads: string[] = [];

  socket.addEventListener("open", () => {
    for (const payload of queuedPayloads.splice(0, queuedPayloads.length)) {
      socket.send(payload);
    }
    input.onOpen?.();
  });

  socket.addEventListener("close", () => {
    input.onClose?.();
  });

  socket.addEventListener("error", () => {
    input.onError?.("SOCKET_ERROR");
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data as string) as GameSocketMessage;
      input.onMessage(message);
    } catch {
      input.onError?.("SOCKET_MESSAGE_PARSE_FAILED");
    }
  });

  const send = (payload: Record<string, unknown>): void => {
    const raw = JSON.stringify(payload);

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(raw);
      return;
    }

    queuedPayloads.push(raw);
  };

  return {
    subscribe(gameId: string): void {
      send({
        type: "SUBSCRIBE_GAME",
        gameId,
      });
    },
    unsubscribe(gameId: string): void {
      send({
        type: "UNSUBSCRIBE_GAME",
        gameId,
      });
    },
    close(): void {
      socket.close();
    },
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Ignore parse failure and fall back to generic message.
  }

  return `HTTP_${response.status}`;
}
