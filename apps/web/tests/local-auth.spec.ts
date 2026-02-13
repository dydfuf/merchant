import { describe, expect, it } from "vitest";

import {
  LOCAL_AUTH_ERROR,
  assertLocalAuthGuard,
  resolveLocalAuthMockEnabled,
} from "../src/lib/local-auth";

describe("로컬 mock auth 가드", () => {
  it("문자열 true일 때만 mock auth를 활성화한다", () => {
    expect(resolveLocalAuthMockEnabled("true")).toBe(true);
    expect(resolveLocalAuthMockEnabled("false")).toBe(false);
    expect(resolveLocalAuthMockEnabled(undefined)).toBe(false);
  });

  it("production에서 mock auth가 true면 예외를 던진다", () => {
    expect(() => assertLocalAuthGuard("production", "true")).toThrowError(
      LOCAL_AUTH_ERROR,
    );
  });

  it("development에서는 mock auth true를 허용한다", () => {
    expect(assertLocalAuthGuard("development", "true")).toBe(true);
  });
});
