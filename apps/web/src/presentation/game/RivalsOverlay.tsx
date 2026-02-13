"use client";

import { useCallback, useMemo, useState } from "react";
import type { PlayerState, TokenColor } from "@repo/shared-types";

import { TOKEN_ORDER } from "./display-data";
import { useDialogAccessibility } from "./useDialogAccessibility";
import styles from "./GameScreen.module.css";

interface RivalsOverlayProps {
  open: boolean;
  players: PlayerState[];
  currentPlayerId: string | null;
  onClose(): void;
}

function toHandle(playerId: string): string {
  return playerId.startsWith("@") ? playerId : `@${playerId}`;
}

function toInitials(playerId: string): string {
  const normalized = playerId.replace(/^@/, "").trim();
  if (!normalized) {
    return "??";
  }

  return normalized.slice(0, 2).toUpperCase();
}

function bonusCount(player: PlayerState, token: TokenColor): number | null {
  if (token === "gold") {
    return null;
  }

  return player.bonuses[token];
}

export function RivalsOverlay({
  open,
  players,
  currentPlayerId,
  onClose,
}: RivalsOverlayProps) {
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useDialogAccessibility({
    open,
    dialogElement,
    backgroundId: "game-shell",
    onClose: handleClose,
  });

  const orderedPlayers = useMemo(() => {
    return [...players].sort((left, right) => {
      if (left.id === currentPlayerId) {
        return -1;
      }

      if (right.id === currentPlayerId) {
        return 1;
      }

      return right.score - left.score;
    });
  }, [currentPlayerId, players]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlayBackdrop}>
      <div
        aria-labelledby="rivals-title"
        aria-modal="true"
        className={styles.rivalsDialog}
        ref={setDialogElement}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.rivalsDialogHeader}>
          <h2 id="rivals-title">상대 현황</h2>
          <button className={styles.rivalsCloseButton} onClick={handleClose} type="button">
            <span>▴</span>
            <span>접기</span>
          </button>
        </header>

        <div className={styles.rivalsDialogBody}>
          {orderedPlayers.map((player) => {
            const isCurrent = player.id === currentPlayerId;

            return (
              <article key={player.id} className={styles.rivalRow} data-active={isCurrent}>
                <div className={styles.rivalRowHeader}>
                  <div className={styles.rivalIdentity}>
                    <div className={styles.rivalAvatar}>{toInitials(player.id)}</div>
                    <div>
                      <p className={styles.rivalHandle}>{toHandle(player.id)}</p>
                      <p className={styles.rivalMeta}>예약 {player.reservedCardIds.length}장</p>
                    </div>
                  </div>

                  <div className={styles.rivalScoreBlock}>
                    <strong>{player.score}</strong>
                    <span>점수</span>
                  </div>
                </div>

                <div className={styles.rivalInventoryGrid}>
                  {TOKEN_ORDER.map((token) => (
                    <div key={`${player.id}-${token}`} className={styles.rivalInventoryColumn}>
                      <div className={styles.rivalCardCell} data-color={token}>
                        {bonusCount(player, token) ?? "-"}
                      </div>
                      <div className={styles.rivalChipCell} data-color={token}>
                        {player.tokens[token] > 0 ? player.tokens[token] : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <footer className={styles.rivalsDialogLegend}>
          <span>
            <i /> 카드
          </span>
          <span>
            <b /> 칩
          </span>
          <button className={styles.rivalsHandleButton} onClick={handleClose} type="button" />
        </footer>
      </div>
    </div>
  );
}
