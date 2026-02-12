import { buildGameState, buildTakeTokensCommand } from "@repo/test-fixtures";
import { describe, expect, it, vi } from "vitest";

import { CommandDispatcherService } from "../../src/application/commands/command-dispatcher.service.js";
import type { GameCommandServiceResult } from "../../src/application/services/game-command.service.js";

describe("커맨드 디스패처 서비스", () => {
  it("커맨드를 핸들러로 위임한다", async () => {
    const initialState = buildGameState();
    const command = buildTakeTokensCommand(
      {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      },
      {
        gameId: initialState.gameId,
        expectedVersion: initialState.version,
        idempotencyKey: "dispatcher-forward",
      },
    );

    const expectedResult: GameCommandServiceResult = {
      kind: "rejected",
      replayed: false,
      reason: "VERSION_CONFLICT",
      retryable: false,
    };

    const handle = vi.fn(async () => expectedResult);
    const dispatcher = new CommandDispatcherService({
      handler: { handle },
    });

    const result = await dispatcher.dispatch(command);
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle).toHaveBeenCalledWith(command);
    expect(result).toEqual(expectedResult);
  });

  it("서비스 성공 결과를 그대로 반환한다", async () => {
    const nextState = buildGameState({ version: 2 });
    const command = buildTakeTokensCommand(
      {
        tokens: { ruby: 1, emerald: 1, sapphire: 1 },
      },
      {
        gameId: nextState.gameId,
        expectedVersion: 1,
        idempotencyKey: "dispatcher-success",
      },
    );

    const expectedResult: GameCommandServiceResult = {
      kind: "accepted",
      replayed: false,
      events: [
        {
          type: "TOKENS_TAKEN",
          gameId: nextState.gameId,
          actorId: command.actorId,
          version: 2,
          payload: {
            tokens: {
              ruby: 1,
              emerald: 1,
              sapphire: 1,
            },
          },
        },
      ],
      nextState,
    };

    const handle = vi.fn(async () => expectedResult);
    const dispatcher = new CommandDispatcherService({
      handler: { handle },
    });

    const result = await dispatcher.dispatch(command);
    expect(result).toEqual(expectedResult);
  });
});
