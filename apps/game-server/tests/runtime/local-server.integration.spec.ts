import type { Command } from "@repo/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

import {
  createLocalGameServer,
  type LocalGameServer,
} from "../../src/runtime/local-server.js";

type WsMessage = {
  type: string;
  gameId?: string;
  payload?: Record<string, unknown>;
};

describe("로컬 게임 서버 런타임", () => {
  let server: LocalGameServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it("게임 생성 후 커맨드 처리 결과를 WS로 브로드캐스트한다", async () => {
    server = createLocalGameServer({
      host: "127.0.0.1",
      port: 0,
    });
    await server.start();

    const createResponse = await fetch(`${server.httpUrl}/local/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerIds: ["player-1", "player-2"],
        seed: "runtime-test-seed",
      }),
    });

    expect(createResponse.status).toBe(201);

    const created = (await createResponse.json()) as {
      gameId: string;
      state: {
        version: number;
      };
    };

    const ws = new WebSocket(`${server.wsUrl}/ws?userId=player-2`);
    const messages: WsMessage[] = [];

    ws.on("message", (raw) => {
      messages.push(JSON.parse(raw.toString()) as WsMessage);
    });

    await onceOpen(ws);
    ws.send(
      JSON.stringify({
        type: "SUBSCRIBE_GAME",
        gameId: created.gameId,
      }),
    );

    const initialSnapshot = await waitForMessage(
      messages,
      (message) => message.type === "GAME_SNAPSHOT" && message.gameId === created.gameId,
    );

    const initialVersion = Number(
      (initialSnapshot.payload?.state as { version?: number } | undefined)?.version ??
        created.state.version,
    );

    const command: Command = {
      type: "TAKE_TOKENS",
      gameId: created.gameId,
      actorId: "player-1",
      expectedVersion: initialVersion,
      idempotencyKey: "runtime-command-1",
      payload: {
        tokens: {
          diamond: 1,
          sapphire: 1,
          emerald: 1,
        },
      },
    };

    const commandResponse = await fetch(
      `${server.httpUrl}/local/games/${created.gameId}/commands`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "player-1",
        },
        body: JSON.stringify({ command }),
      },
    );

    expect(commandResponse.status).toBe(200);

    const commandResult = (await commandResponse.json()) as {
      ok: boolean;
      result?: {
        kind: string;
      };
    };

    expect(commandResult.ok).toBe(true);
    expect(commandResult.result?.kind).toBe("accepted");

    const eventMessage = await waitForMessage(
      messages,
      (message) => message.type === "GAME_EVENTS" && message.gameId === created.gameId,
    );

    const firstEvent = ((eventMessage.payload?.events as unknown[])?.[0] ?? null) as
      | {
          type?: string;
        }
      | null;

    expect(firstEvent?.type).toBe("TOKENS_TAKEN");

    const updatedSnapshot = await waitForMessage(
      messages,
      (message) => {
        if (message.type !== "GAME_SNAPSHOT" || message.gameId !== created.gameId) {
          return false;
        }

        const version = (message.payload?.state as { version?: number } | undefined)
          ?.version;
        return typeof version === "number" && version >= initialVersion + 1;
      },
    );

    const nextVersion = (updatedSnapshot.payload?.state as { version?: number } | undefined)
      ?.version;
    expect(nextVersion).toBe(initialVersion + 1);

    ws.close();
  });
});

function onceOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WS_OPEN_TIMEOUT"));
    }, 1_500);

    socket.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function waitForMessage(
  messages: WsMessage[],
  predicate: (message: WsMessage) => boolean,
  timeoutMs = 2_000,
): Promise<WsMessage> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const matched = messages.find(predicate);
    if (matched) {
      return matched;
    }

    await sleep(20);
  }

  throw new Error("WS_MESSAGE_TIMEOUT");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
