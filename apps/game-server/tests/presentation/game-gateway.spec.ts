import { buildTakeTokensCommand, buildGameState } from "@repo/test-fixtures";
import { describe, expect, it } from "vitest";

import { CommandDispatcherService } from "../../src/application/commands/command-dispatcher.service.js";
import { GameGateway } from "../../src/presentation/ws/game.gateway.js";

describe("게임 게이트웨이", () => {
  it("인증 사용자와 actor가 다르면 즉시 거절한다", async () => {
    const command = buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        gameId: buildGameState().gameId,
        actorId: "player-1",
        idempotencyKey: "gateway-unauthorized",
      },
    );

    const dispatcher = new CommandDispatcherService({
      handler: {
        async handle() {
          return {
            kind: "rejected",
            replayed: false,
            reason: "STATE_NOT_FOUND",
            retryable: false,
          } as const;
        },
      },
    });

    const gateway = new GameGateway({ dispatcher });
    const result = await gateway.handleCommand({
      auth: {
        userId: "other-user",
      },
      command,
    });

    expect(result).toEqual({
      ok: false,
      reason: "UNAUTHORIZED_ACTOR",
      message: "actorId must match authenticated user",
    });
  });

  it("인증이 일치하면 디스패처 결과를 반환한다", async () => {
    const state = buildGameState();
    const command = buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        gameId: state.gameId,
        actorId: "player-1",
        expectedVersion: state.version,
        idempotencyKey: "gateway-forward",
      },
    );

    const dispatcher = new CommandDispatcherService({
      handler: {
        async handle() {
          return {
            kind: "accepted",
            replayed: false,
            events: [
              {
                type: "TOKENS_TAKEN",
                gameId: state.gameId,
                actorId: "player-1",
                version: state.version + 1,
                payload: {
                  tokens: {
                    diamond: 1,
                    sapphire: 1,
                    emerald: 1,
                  },
                },
              },
            ],
            nextState: {
              ...state,
              version: state.version + 1,
            },
          } as const;
        },
      },
    });

    const gateway = new GameGateway({ dispatcher });

    const result = await gateway.handleCommand({
      auth: {
        userId: "player-1",
      },
      command,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("게이트웨이 성공 응답이 필요합니다.");
    }

    expect(result.result.kind).toBe("accepted");
    if (result.result.kind !== "accepted") {
      throw new Error("accepted 결과가 필요합니다.");
    }
    expect(result.result.nextState.version).toBe(state.version + 1);
  });
});
