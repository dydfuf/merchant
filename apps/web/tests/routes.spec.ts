import { describe, expect, it } from "vitest";

import { buildGameHref, buildGamePath } from "../src/lib/routes";

describe("게임 라우트 헬퍼", () => {
  it("gameId로 /games/[gameId] 경로를 생성한다", () => {
    expect(buildGamePath("merchant-local-1")).toBe("/games/merchant-local-1");
  });

  it("userId 쿼리를 포함한 href를 생성한다", () => {
    expect(buildGameHref("merchant-local-1", "player 1")).toBe(
      "/games/merchant-local-1?userId=player%201",
    );
  });
});
