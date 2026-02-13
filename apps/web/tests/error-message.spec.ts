import { describe, expect, it } from "vitest";

import { toKoreanErrorMessage } from "../src/presentation/i18n/error-message";

describe("오류 메시지 한글화 유틸", () => {
  it("알려진 에러 코드를 한국어 문구로 변환한다", () => {
    expect(toKoreanErrorMessage("GAME_NOT_READY")).toContain(
      "게임 상태가 아직 준비되지 않았습니다.",
    );
  });

  it("HTTP 상태 코드를 한국어 문구로 변환한다", () => {
    expect(toKoreanErrorMessage("GAME_LOAD_FAILED:HTTP_403")).toContain(
      "권한이 없습니다.",
    );
  });

  it("정의되지 않은 에러는 원문을 함께 보여준다", () => {
    expect(toKoreanErrorMessage("SOMETHING_NEW")).toBe(
      "오류가 발생했습니다. (SOMETHING_NEW)",
    );
  });
});
