import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PAGE_STYLE_PATH = resolve(process.cwd(), "app/page.module.css");

describe("웹 페이지 스타일 가드", () => {
  it("CSS Module에 전역 button 셀렉터를 사용하지 않는다", () => {
    const css = readFileSync(PAGE_STYLE_PATH, "utf8");

    expect(css).not.toMatch(/(^|\n)\s*button(\s*[{:,])/);
    expect(css).not.toMatch(/(^|\n)\s*button:hover\s*{/);
  });
});
