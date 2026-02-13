import { describe, expect, it } from "vitest";

import { resolveLobbyStatusLabel } from "../src/presentation/lobby/status-label";

describe("로비 상태 라벨 처리", () => {
  it("첫 번째 your-turn 상태는 상태 키 기준으로 내 턴을 표시한다", () => {
    expect(resolveLobbyStatusLabel("your-turn", "임의 라벨", 0)).toBe("내 턴");
  });

  it("your-turn이 아니면 전달된 라벨을 그대로 사용한다", () => {
    expect(resolveLobbyStatusLabel("expiring", "만료 임박", 0)).toBe("만료 임박");
  });

  it("your-turn이어도 첫 번째 항목이 아니면 전달된 라벨을 사용한다", () => {
    expect(resolveLobbyStatusLabel("your-turn", "내 차례 곧 시작", 2)).toBe(
      "내 차례 곧 시작",
    );
  });
});
