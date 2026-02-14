"use client";

import React, { useMemo } from "react";
import type { PlayerState, TokenColor } from "@repo/shared-types";
import { BaseDialog } from "@repo/ui/base-dialog";

import { TOKEN_ORDER } from "./display-data";
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

  return (
    <BaseDialog.Root
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles.overlayBackdrop} />
        <div className={styles.overlayViewport}>
          <BaseDialog.Popup aria-labelledby="rivals-title" className={styles.rivalsDialog}>
            <header className={styles.rivalsDialogHeader}>
              <BaseDialog.Title id="rivals-title">상대 현황</BaseDialog.Title>
              <BaseDialog.Close className={styles.rivalsCloseButton} type="button">
                <span>▴</span>
                <span>접기</span>
              </BaseDialog.Close>
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
              <BaseDialog.Close
                aria-label="상대 현황 닫기"
                className={styles.rivalsHandleButton}
                type="button"
              />
            </footer>
          </BaseDialog.Popup>
        </div>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
