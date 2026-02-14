import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerState } from "@repo/shared-types";

import { CardDetailModal } from "../src/presentation/game/CardDetailModal";
import { RivalsOverlay } from "../src/presentation/game/RivalsOverlay";
import { VaultSheet } from "../src/presentation/game/VaultSheet";

const reactActGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactActGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const PLAYER_FIXTURE: PlayerState = {
  id: "player-1",
  score: 3,
  tokens: {
    diamond: 1,
    sapphire: 2,
    emerald: 1,
    ruby: 0,
    onyx: 0,
    gold: 1,
  },
  bonuses: {
    diamond: 0,
    sapphire: 1,
    emerald: 0,
    ruby: 0,
    onyx: 0,
  },
  reservedCardIds: ["tier-2-card-a"],
  purchasedCardIds: [],
  nobleIds: [],
};

function CardDetailHarness({ onClose }: { onClose(): void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button id="card-trigger" onClick={() => setOpen(true)} type="button">
        카드 상세 열기
      </button>
      <CardDetailModal
        cardId="tier-2-card-a"
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        onReserve={() => {}}
        open={open}
        player={PLAYER_FIXTURE}
      />
    </>
  );
}

function RivalsHarness({ onClose }: { onClose(): void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button id="rivals-trigger" onClick={() => setOpen(true)} type="button">
        상대 현황 열기
      </button>
      <RivalsOverlay
        currentPlayerId="player-1"
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        open={open}
        players={[PLAYER_FIXTURE]}
      />
    </>
  );
}

function VaultHarness({ onClose }: { onClose(): void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button id="vault-trigger" onClick={() => setOpen(true)} type="button">
        금고 시트 열기
      </button>
      <VaultSheet
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        open={open}
        player={PLAYER_FIXTURE}
      />
    </>
  );
}

describe("게임 오버레이 접근성 동작", () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderNode(node: React.ReactNode) {
    act(() => {
      root.render(node);
    });
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("카드 상세 오버레이에서 Escape 입력 시 닫기 콜백을 호출한다", () => {
    const onClose = vi.fn();
    renderNode(<CardDetailHarness onClose={onClose} />);

    const trigger = document.querySelector("#card-trigger") as HTMLButtonElement;

    act(() => {
      trigger.click();
    });

    const dialog = document.querySelector("[role='dialog']") as HTMLElement;

    act(() => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("카드 상세 오버레이를 닫으면 트리거 버튼으로 포커스가 돌아온다", async () => {
    const onClose = vi.fn();
    renderNode(<CardDetailHarness onClose={onClose} />);

    const trigger = document.querySelector("#card-trigger") as HTMLButtonElement;

    act(() => {
      trigger.focus();
      trigger.click();
    });

    const dialog = document.querySelector("[role='dialog']") as HTMLElement;

    act(() => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(document.activeElement).toBe(trigger);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("상대 현황 오버레이 닫기 버튼이 콜백을 호출한다", () => {
    const onClose = vi.fn();
    renderNode(<RivalsHarness onClose={onClose} />);

    const trigger = document.querySelector("#rivals-trigger") as HTMLButtonElement;

    act(() => {
      trigger.click();
    });

    const closeButton = document.querySelector(
      '[aria-label="상대 현황 닫기"]',
    ) as HTMLButtonElement;

    act(() => {
      closeButton.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("금고 시트 닫기 핸들을 누르면 닫기 콜백을 호출한다", () => {
    const onClose = vi.fn();
    renderNode(<VaultHarness onClose={onClose} />);

    const trigger = document.querySelector("#vault-trigger") as HTMLButtonElement;

    act(() => {
      trigger.click();
    });

    const closeButton = document.querySelector(
      '[aria-label="금고 시트 닫기"]',
    ) as HTMLButtonElement;

    act(() => {
      closeButton.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
