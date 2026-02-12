import { describe, expect, it } from "vitest";

import { evaluateIdempotencyKey } from "../../src/application/policies/idempotency.policy.js";

describe("멱등성 키 평가 정책", () => {
  it("중복 키는 거부하고 새로운 키는 허용한다", () => {
    const seenKeys = new Set(["command-1"]);

    expect(evaluateIdempotencyKey(seenKeys, "command-1")).toBe(
      "reject_duplicate",
    );
    expect(evaluateIdempotencyKey(seenKeys, "command-2")).toBe("accept");
  });
});
