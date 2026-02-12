import { describe, expect, it } from "vitest";

import { evaluateIdempotencyKey } from "../../src/application/policies/idempotency.policy.js";

describe("evaluateIdempotencyKey", () => {
  it("rejects duplicate keys and accepts fresh keys", () => {
    const seenKeys = new Set(["command-1"]);

    expect(evaluateIdempotencyKey(seenKeys, "command-1")).toBe(
      "reject_duplicate",
    );
    expect(evaluateIdempotencyKey(seenKeys, "command-2")).toBe("accept");
  });
});
