import { afterEach, describe, expect, it } from "vitest";

import { createIdempotencyKey } from "../src/lib/idempotency";
import {
  resolveGameServerUrl,
  resolveGameServerWsUrl,
} from "../src/lib/game-client";

describe("로컬 게임 클라이언트 유틸", () => {
  const originalUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_GAME_SERVER_URL = originalUrl;
  });

  it("환경변수가 없으면 기본 서버 URL을 사용한다", () => {
    delete process.env.NEXT_PUBLIC_GAME_SERVER_URL;

    expect(resolveGameServerUrl()).toBe("http://127.0.0.1:4010");
    expect(resolveGameServerWsUrl()).toBe("ws://127.0.0.1:4010");
  });

  it("환경변수가 있으면 해당 URL과 WS URL을 계산한다", () => {
    process.env.NEXT_PUBLIC_GAME_SERVER_URL = "https://merchant.local/";

    expect(resolveGameServerUrl()).toBe("https://merchant.local");
    expect(resolveGameServerWsUrl()).toBe("wss://merchant.local");
  });

  it("idempotency 키는 접두사를 포함하고 매번 다르게 생성된다", () => {
    const first = createIdempotencyKey("take");
    const second = createIdempotencyKey("take");

    expect(first.startsWith("take:")).toBe(true);
    expect(second.startsWith("take:")).toBe(true);
    expect(first).not.toBe(second);
  });
});
