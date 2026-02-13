"use client";

import { useCallback, useState } from "react";
import type { PlayerState } from "@repo/shared-types";

import {
  canAffordCost,
  gemLabel,
  getCardVisual,
  totalPowerByColor,
} from "./display-data";
import { useDialogAccessibility } from "./useDialogAccessibility";
import styles from "./GameScreen.module.css";

interface CardDetailModalProps {
  open: boolean;
  cardId: string | null;
  player: PlayerState | null;
  onReserve(): void;
  onClose(): void;
}

export function CardDetailModal({
  open,
  cardId,
  player,
  onReserve,
  onClose,
}: CardDetailModalProps) {
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

  if (!open || !cardId) {
    return null;
  }

  const card = getCardVisual(cardId);
  const affordable = canAffordCost(player, card.cost);

  return (
    <div className={styles.overlayBackdrop}>
      <div
        aria-labelledby="card-detail-title"
        aria-modal="true"
        className={styles.cardDetailDialog}
        ref={setDialogElement}
        role="dialog"
        tabIndex={-1}
      >
        <header className={styles.cardDetailHeader}>
          <span>자산 상세</span>
          <button onClick={handleClose} type="button">
            ×
          </button>
        </header>

        <div className={styles.cardDetailBody}>
          <article className={styles.detailAssetCard}>
            <div className={styles.detailAssetTop}>
              <div>
                <strong>{card.points}</strong>
                <p>명성</p>
              </div>
              <div className={styles.detailBonusBlock}>
                <i className={styles.dot} data-color={card.bonus} />
                <span>보너스</span>
              </div>
            </div>

            <div className={styles.detailAssetArt} />

            <footer className={styles.detailAssetFoot}>
              <span>티어 {card.tier} 개발 카드</span>
              <b>{cardId}</b>
            </footer>
          </article>

          <section className={styles.costSection}>
            <div className={styles.costSectionHeader}>
              <h3 id="card-detail-title">획득 비용</h3>
              <span data-affordable={affordable}>{affordable ? "구매 가능" : "잠김"}</span>
            </div>

            <div className={styles.costRows}>
              {card.cost.map((costItem) => {
                const owned = totalPowerByColor(player, costItem.color);
                const enough = owned >= costItem.amount;

                return (
                  <div key={`${cardId}-${costItem.color}`} className={styles.costRow}>
                    <div className={styles.costRowLeft}>
                      <i className={styles.dot} data-color={costItem.color} />
                      <strong>{costItem.amount}</strong>
                      <span>{gemLabel(costItem.color)} 필요</span>
                    </div>

                    <div className={styles.costRowRight}>
                      <small>보유 수량</small>
                      <b>{owned}</b>
                      <em data-enough={enough}>{enough ? "✓" : "!"}</em>
                    </div>
                  </div>
                );
              })}
            </div>

            {!affordable ? (
              <p className={styles.costHint}>
                자원이 부족합니다. 카드를 예약하고 금고를 키운 뒤 다음 턴에 구매하세요.
              </p>
            ) : null}
          </section>
        </div>

        <footer className={styles.cardDetailFooter}>
          <button className={styles.purchaseDisabledButton} disabled type="button">
            <span>카드 구매</span>
            <span>⛔</span>
          </button>

          <button
            className={styles.reserveButton}
            onClick={() => {
              onReserve();
              onClose();
            }}
            type="button"
          >
            <div>
              <strong>예약</strong>
              <small>나중에 구매</small>
            </div>
            <span>+1 골드</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
