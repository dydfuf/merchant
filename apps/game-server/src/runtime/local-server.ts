import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import type { Command, GameId } from "@repo/shared-types";
import WebSocket, { WebSocketServer, type RawData } from "ws";

import { bootstrapApp } from "../bootstrap/app.bootstrap.js";
import type { Logger } from "../infrastructure/logger/logger.js";
import { createConsoleLogger } from "../infrastructure/logger/logger.js";
import { createLocalGameContext } from "../infrastructure/repositories/local-game-seed.js";
import {
  LocalGameRegistryRepository,
  type LocalGameStateUpdate,
} from "../infrastructure/repositories/local-game-registry.repo.js";
import { createHealthController } from "../presentation/http/health/health.controller.js";
import { isHealthRoute } from "../presentation/http/health/health.route.js";
import { GameQueryService } from "../application/services/game-query.service.js";

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-user-id",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

type WsClientMessage =
  | {
      type: "SUBSCRIBE_GAME";
      gameId: string;
    }
  | {
      type: "UNSUBSCRIBE_GAME";
      gameId: string;
    };

type WsServerMessage =
  | {
      type: "GAME_SNAPSHOT";
      gameId: string;
      payload: {
        state: unknown;
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

export interface LocalGameServerOptions {
  host: string;
  port: number;
  repository?: LocalGameRegistryRepository;
  logger?: Logger;
}

export interface LocalGameServer {
  readonly host: string;
  readonly port: number;
  readonly httpUrl: string;
  readonly wsUrl: string;
  readonly repository: LocalGameRegistryRepository;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createLocalGameServer(
  options: LocalGameServerOptions,
): LocalGameServer {
  const repository = options.repository ?? new LocalGameRegistryRepository();
  const logger = options.logger ?? createConsoleLogger("game-server-local");
  const queryService = new GameQueryService({ repository });
  const healthController = createHealthController({ mode: "local-inmemory" });
  const { gameGateway } = bootstrapApp({ repository, logger });

  const server = createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS") {
        sendEmpty(response, 204);
        return;
      }

      if (isHealthRoute(request)) {
        sendJson(response, 200, healthController.getHealth());
        return;
      }

      const url = toRequestUrl(request);
      const pathname = url.pathname;

      if (request.method === "POST" && pathname === "/local/games") {
        const body = await readJsonBody(request);
        const gameId = resolveGameId(body);
        const seed = resolveSeed(body);
        const playerIds = resolvePlayerIds(body);

        try {
          const context = createLocalGameContext({
            gameId: gameId as GameId,
            playerIds,
            seed,
          });
          await repository.createGame(context);

          sendJson(response, 201, {
            gameId,
            state: context.state,
            playerOrder: context.playerOrder,
          });
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : "GAME_CREATE_FAILED";
          sendJson(response, 400, {
            ok: false,
            error: message,
          });
          return;
        }
      }

      const gameMatch = pathname.match(/^\/local\/games\/([^/]+)$/);
      if (request.method === "GET" && gameMatch) {
        const gameIdParam = gameMatch[1];
        if (!gameIdParam) {
          sendJson(response, 400, {
            ok: false,
            error: "INVALID_GAME_ID",
          });
          return;
        }

        const gameId = decodeURIComponent(gameIdParam);
        const context = await queryService.getGameContext(gameId);

        if (!context) {
          sendJson(response, 404, {
            ok: false,
            error: "GAME_NOT_FOUND",
          });
          return;
        }

        sendJson(response, 200, {
          gameId,
          state: context.state,
          playerOrder: context.playerOrder,
        });
        return;
      }

      const commandMatch = pathname.match(/^\/local\/games\/([^/]+)\/commands$/);
      if (request.method === "POST" && commandMatch) {
        const gameIdParam = commandMatch[1];
        if (!gameIdParam) {
          sendJson(response, 400, {
            ok: false,
            error: "INVALID_GAME_ID",
          });
          return;
        }

        const gameId = decodeURIComponent(gameIdParam);
        const body = await readJsonBody(request);

        if (!isRecord(body) || !isCommand(body.command)) {
          sendJson(response, 400, {
            ok: false,
            error: "INVALID_COMMAND_BODY",
          });
          return;
        }

        const command = body.command;
        if (command.gameId !== gameId) {
          sendJson(response, 400, {
            ok: false,
            error: "COMMAND_GAME_ID_MISMATCH",
          });
          return;
        }

        const authUserId = resolveAuthUserId(request, command.actorId);
        const gatewayResponse = await gameGateway.handleCommand({
          auth: {
            userId: authUserId,
          },
          command,
        });

        if (gatewayResponse.ok) {
          sendJson(response, 200, gatewayResponse);
          return;
        }

        sendJson(response, 403, gatewayResponse);
        return;
      }

      sendJson(response, 404, {
        ok: false,
        error: "NOT_FOUND",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
      logger.error("local server request failed", { message });
      sendJson(response, 500, {
        ok: false,
        error: "INTERNAL_SERVER_ERROR",
      });
    }
  });

  const wsServer = new WebSocketServer({ noServer: true });
  const subscriptions = new Map<WebSocket, Map<string, () => void>>();

  wsServer.on("connection", (socket) => {
    subscriptions.set(socket, new Map());

    socket.on("message", async (raw) => {
      const message = parseWsClientMessage(raw);
      if (!message) {
        sendWs(socket, {
          type: "ERROR",
          payload: {
            code: "INVALID_WS_MESSAGE",
            message: "message must be valid JSON with known type",
          },
        });
        return;
      }

      if (message.type === "UNSUBSCRIBE_GAME") {
        removeSubscription(subscriptions, socket, message.gameId);
        return;
      }

      const context = await queryService.getGameContext(message.gameId);
      if (!context) {
        sendWs(socket, {
          type: "ERROR",
          gameId: message.gameId,
          payload: {
            code: "GAME_NOT_FOUND",
            message: "game does not exist",
          },
        });
        return;
      }

      addSubscription(subscriptions, socket, message.gameId, repository);
      sendWs(socket, {
        type: "GAME_SNAPSHOT",
        gameId: message.gameId,
        payload: {
          state: context.state,
        },
      });
    });

    const cleanup = () => {
      removeAllSubscriptions(subscriptions, socket);
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });

  server.on("upgrade", (request, socket, head) => {
    const url = toRequestUrl(request);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request);
    });
  });

  let started = false;
  let currentPort = options.port;

  return {
    host: options.host,
    get port(): number {
      return currentPort;
    },
    get httpUrl(): string {
      return `http://${options.host}:${currentPort}`;
    },
    get wsUrl(): string {
      return `ws://${options.host}:${currentPort}`;
    },
    repository,
    async start(): Promise<void> {
      if (started) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.port, options.host, () => {
          server.off("error", reject);
          resolve();
        });
      });

      const address = server.address();
      if (address && typeof address === "object") {
        currentPort = address.port;
      }

      started = true;
      logger.info("local game server started", {
        host: options.host,
        port: currentPort,
      });
    },
    async stop(): Promise<void> {
      if (!started) {
        return;
      }

      for (const ws of wsServer.clients) {
        ws.close();
      }

      await new Promise<void>((resolve) => {
        wsServer.close(() => resolve());
      });

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      started = false;
    },
  };
}

function addSubscription(
  subscriptions: Map<WebSocket, Map<string, () => void>>,
  socket: WebSocket,
  gameId: string,
  repository: LocalGameRegistryRepository,
): void {
  const socketSubscriptions = subscriptions.get(socket);
  if (!socketSubscriptions) {
    return;
  }

  if (socketSubscriptions.has(gameId)) {
    return;
  }

  const unsubscribe = repository.subscribe(gameId, (update) => {
    sendGameUpdate(socket, update);
  });

  socketSubscriptions.set(gameId, unsubscribe);
}

function sendGameUpdate(socket: WebSocket, update: LocalGameStateUpdate): void {
  sendWs(socket, {
    type: "GAME_EVENTS",
    gameId: update.gameId,
    payload: {
      events: update.events,
    },
  });

  sendWs(socket, {
    type: "GAME_SNAPSHOT",
    gameId: update.gameId,
    payload: {
      state: update.state,
    },
  });
}

function removeSubscription(
  subscriptions: Map<WebSocket, Map<string, () => void>>,
  socket: WebSocket,
  gameId: string,
): void {
  const socketSubscriptions = subscriptions.get(socket);
  if (!socketSubscriptions) {
    return;
  }

  const unsubscribe = socketSubscriptions.get(gameId);
  if (!unsubscribe) {
    return;
  }

  unsubscribe();
  socketSubscriptions.delete(gameId);
}

function removeAllSubscriptions(
  subscriptions: Map<WebSocket, Map<string, () => void>>,
  socket: WebSocket,
): void {
  const socketSubscriptions = subscriptions.get(socket);
  if (!socketSubscriptions) {
    return;
  }

  for (const unsubscribe of socketSubscriptions.values()) {
    unsubscribe();
  }

  socketSubscriptions.clear();
  subscriptions.delete(socket);
}

function parseWsClientMessage(raw: RawData): WsClientMessage | null {
  try {
    const payload = JSON.parse(raw.toString()) as unknown;
    if (!isRecord(payload) || typeof payload.type !== "string") {
      return null;
    }

    if (payload.type !== "SUBSCRIBE_GAME" && payload.type !== "UNSUBSCRIBE_GAME") {
      return null;
    }

    if (typeof payload.gameId !== "string" || payload.gameId.trim().length === 0) {
      return null;
    }

    return {
      type: payload.type,
      gameId: payload.gameId,
    };
  } catch {
    return null;
  }
}

function sendWs(socket: WebSocket, message: WsServerMessage): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(message));
}

function resolveGameId(body: unknown): string {
  if (isRecord(body) && typeof body.gameId === "string" && body.gameId.trim().length > 0) {
    return body.gameId.trim();
  }

  return `game-${randomUUID().slice(0, 8)}`;
}

function resolveSeed(body: unknown): string {
  if (isRecord(body) && typeof body.seed === "string" && body.seed.trim().length > 0) {
    return body.seed.trim();
  }

  return randomUUID();
}

function resolvePlayerIds(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.playerIds)) {
    return ["player-1", "player-2"];
  }

  const normalized = body.playerIds
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (normalized.length === 0) {
    return ["player-1", "player-2"];
  }

  return normalized;
}

function resolveAuthUserId(request: IncomingMessage, fallback: string): string {
  const headerValue = request.headers["x-user-id"];

  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  return fallback;
}

function isCommand(value: unknown): value is Command {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.type === "string" &&
    typeof value.gameId === "string" &&
    typeof value.actorId === "string" &&
    typeof value.expectedVersion === "number" &&
    typeof value.idempotencyKey === "string" &&
    isRecord(value.payload)
  );
}

function toRequestUrl(request: IncomingMessage): URL {
  const host = request.headers.host ?? "localhost";
  return new URL(request.url ?? "/", `http://${host}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonBody(
  request: IncomingMessage,
): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_JSON_BODY");
  }

  if (!isRecord(parsed)) {
    throw new Error("INVALID_JSON_BODY");
  }

  return parsed;
}

function sendEmpty(response: ServerResponse, statusCode: number): void {
  response.writeHead(statusCode, {
    ...CORS_HEADERS,
  });
  response.end();
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);

  response.writeHead(statusCode, {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body).toString(),
  });
  response.end(body);
}
