import type { Command } from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { applyCommand } from "../../src/application/apply-command.js";
import { createGameState } from "../helpers/state.factory.js";

interface CommandEnvelopeScenario {
  name: string;
  commandFactory: (stateGameId: string, version: number) => Command;
  expectedReason: string;
}

const commandEnvelopeScenarios: readonly CommandEnvelopeScenario[] = [
  {
    name: "TAKE_TOKENS payload가 객체가 아니면 거부한다",
    commandFactory: (gameId, version) =>
      ({
        type: "TAKE_TOKENS",
        gameId,
        actorId: "p1",
        expectedVersion: version,
        idempotencyKey: "invalid:take:payload",
        payload: [] as unknown,
      } as unknown as Command),
    expectedReason: "INVALID_PAYLOAD",
  },
  {
    name: "RESERVE_CARD target이 없으면 거부한다",
    commandFactory: (gameId, version) =>
      ({
        type: "RESERVE_CARD",
        gameId,
        actorId: "p1",
        expectedVersion: version,
        idempotencyKey: "invalid:reserve:target",
        payload: {
          takeGoldToken: true,
        },
      } as unknown as Command),
    expectedReason: "INVALID_PAYLOAD_RESERVE_CARD",
  },
  {
    name: "BUY_CARD source가 없으면 거부한다",
    commandFactory: (gameId, version) =>
      ({
        type: "BUY_CARD",
        gameId,
        actorId: "p1",
        expectedVersion: version,
        idempotencyKey: "invalid:buy:source",
        payload: {
          payment: {},
        },
      } as unknown as Command),
    expectedReason: "INVALID_PAYLOAD_BUY_CARD",
  },
  {
    name: "END_TURN reason이 잘못되면 거부한다",
    commandFactory: (gameId, version) =>
      ({
        type: "END_TURN",
        gameId,
        actorId: "p1",
        expectedVersion: version,
        idempotencyKey: "invalid:end-turn:reason",
        payload: {
          reason: "AUTO",
        },
      } as unknown as Command),
    expectedReason: "INVALID_PAYLOAD_END_TURN",
  },
];

describe("명령 엔벌로프 시나리오", () => {
  it.each(commandEnvelopeScenarios)("$name", ({ commandFactory, expectedReason }) => {
    const state = createGameState();
    const result = applyCommand({
      state,
      command: commandFactory(state.gameId, state.version),
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result).toEqual({
      ok: false,
      code: "COMMAND_ENVELOPE_INVALID",
      reason: expectedReason,
    });
  });
});
