import { describe, expect, it } from "vitest";

import { validateCommandEnvelope } from "../../src/application/validate-command.js";

describe("validateCommandEnvelope", () => {
  it("returns the same result for identical command input", () => {
    const command = {
      type: "TAKE_TOKENS",
      actorId: "player-1",
      expectedVersion: 3,
      idempotencyKey: "take-3-gems-turn-2",
      payload: { ruby: 1, emerald: 1, sapphire: 1 },
    };

    const first = validateCommandEnvelope(command);
    const second = validateCommandEnvelope(command);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual(first);
  });
});
