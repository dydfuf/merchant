import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDialogAccessibility } from "../src/presentation/game/useDialogAccessibility";

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

interface HarnessProps {
  open: boolean;
  onClose(): void;
}

function DialogHarness({ open, onClose }: HarnessProps) {
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(null);

  useDialogAccessibility({
    open,
    dialogElement,
    backgroundId: "game-shell",
    onClose,
  });

  if (!open) {
    return null;
  }

  return (
    <div ref={setDialogElement} role="dialog" tabIndex={-1}>
      <button id="first-button" type="button">
        First
      </button>
      <button id="last-button" type="button">
        Last
      </button>
    </div>
  );
}

describe("게임 오버레이 접근성 훅", () => {
  let container: HTMLDivElement;
  let root: Root;
  let background: HTMLDivElement;

  function renderDialog(props: HarnessProps) {
    act(() => {
      root.render(<DialogHarness {...props} />);
    });
  }

  beforeEach(() => {
    background = document.createElement("div");
    background.id = "game-shell";
    document.body.appendChild(background);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    background.remove();
    container.remove();
  });

  it("오버레이 열기/닫기에서 배경 inert 속성을 토글한다", () => {
    renderDialog({ open: true, onClose: vi.fn() });

    expect(background.getAttribute("inert")).toBe("");
    expect(background.getAttribute("aria-hidden")).toBe("true");

    renderDialog({ open: false, onClose: vi.fn() });

    expect(background.hasAttribute("inert")).toBe(false);
    expect(background.hasAttribute("aria-hidden")).toBe(false);
  });

  it("Escape 키 입력 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    renderDialog({ open: true, onClose });

    const dialog = container.querySelector("[role='dialog']") as HTMLDivElement;

    act(() => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Tab과 Shift+Tab으로 포커스가 대화상자 내부에서 순환한다", () => {
    renderDialog({ open: true, onClose: vi.fn() });

    const dialog = container.querySelector("[role='dialog']") as HTMLDivElement;
    const firstButton = container.querySelector("#first-button") as HTMLButtonElement;
    const lastButton = container.querySelector("#last-button") as HTMLButtonElement;

    act(() => {
      lastButton.focus();
    });

    act(() => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    });

    expect(document.activeElement).toBe(firstButton);

    act(() => {
      firstButton.focus();
    });

    act(() => {
      dialog.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
        }),
      );
    });

    expect(document.activeElement).toBe(lastButton);
  });

  it("오버레이 종료 시 이전 포커스 요소로 복귀한다", () => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "open";
    document.body.appendChild(trigger);

    act(() => {
      trigger.focus();
    });

    renderDialog({ open: true, onClose: vi.fn() });
    renderDialog({ open: false, onClose: vi.fn() });

    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });
});
