"use client";

import React, { useMemo } from "react";
import type { PlayerState, TokenColor } from "@repo/shared-types";
import { BaseDrawerPreview } from "@repo/ui/base-drawer-preview";

import {
  canAffordCost,
  gemLabel,
  getCardVisual,
  TOKEN_ORDER,
  totalPowerByColor,
} from "./display-data";
import styles from "./GameScreen.module.css";

interface VaultSheetProps {
  open: boolean;
  player: PlayerState | null;
  onClose(): void;
}

function tokensOnly(player: PlayerState | null, color: TokenColor): number {
  return player?.tokens[color] ?? 0;
}

function bonusesOnly(player: PlayerState | null, color: TokenColor): number {
  if (!player || color === "gold") {
    return 0;
  }

  return player.bonuses[color];
}

export function VaultSheet({ open, player, onClose }: VaultSheetProps) {
  const totalTokens = useMemo(() => {
    if (!player) {
      return 0;
    }

    return Object.values(player.tokens).reduce((sum, value) => sum + value, 0);
  }, [player]);

  return (
    <BaseDrawerPreview.Root
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
      swipeDirection="down"
    >
      <BaseDrawerPreview.Portal>
        <BaseDrawerPreview.Backdrop className={styles.overlayBackdrop} />

        <div className={styles.overlayViewport}>
          <div className={styles.sheetDock}>
            <BaseDrawerPreview.Popup aria-labelledby="vault-title" className={styles.vaultSheet}>
              <BaseDrawerPreview.Content>
                <header className={styles.vaultHeader}>
                  <BaseDrawerPreview.Close
                    aria-label="금고 시트 닫기"
                    className={styles.vaultDragHandle}
                    type="button"
                  />

                  <div className={styles.vaultHeaderRow}>
                    <BaseDrawerPreview.Title id="vault-title">총 구매력</BaseDrawerPreview.Title>
                    <span>{totalTokens} / 10칩</span>
                  </div>

                  <div className={styles.vaultTotalsGrid}>
                    {TOKEN_ORDER.map((token) => {
                      const chips = tokensOnly(player, token);
                      const bonuses = bonusesOnly(player, token);
                      const total = totalPowerByColor(player, token);

                      return (
                        <div key={token} className={styles.vaultTotalCard} data-color={token}>
                          <i className={styles.dot} data-color={token} />
                          <strong>{total}</strong>
                          <small>
                            ({chips}+{bonuses})
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </header>

                <div className={styles.vaultBody}>
                  <section className={styles.vaultSection}>
                    <div className={styles.vaultSectionHeader}>
                      <h3>예약 카드</h3>
                      <span>{player?.reservedCardIds.length ?? 0} / 3칸</span>
                    </div>

                    <div className={styles.reservedCardsRow}>
                      {player && player.reservedCardIds.length > 0 ? (
                        player.reservedCardIds.map((cardId) => {
                          const card = getCardVisual(cardId);
                          const affordable = canAffordCost(player, card.cost);

                          return (
                            <article
                              key={cardId}
                              className={styles.reservedCard}
                              data-affordable={affordable}
                            >
                              <div className={styles.cardStripe} data-color={card.bonus} />
                              <div className={styles.reservedCardBody}>
                                <div className={styles.reservedCardTop}>
                                  <strong>{card.points}</strong>
                                  <span className={styles.dot} data-color={card.bonus} />
                                </div>

                                <div className={styles.reservedCostList}>
                                  {card.cost.map((item) => (
                                    <p key={`${cardId}-${item.color}`}>
                                      <span>{gemLabel(item.color)}</span>
                                      <b>{item.amount}</b>
                                    </p>
                                  ))}
                                </div>
                              </div>
                              <div className={styles.reservedCardFooter}>
                                {affordable ? "구매 가능" : "구매 불가"}
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <div className={styles.reservedPlaceholder}>빈 슬롯</div>
                      )}
                    </div>
                  </section>

                  <section className={styles.vaultSection}>
                    <div className={styles.vaultSectionHeader}>
                      <h3>자산 상세</h3>
                    </div>

                    <div className={styles.breakdownTable}>
                      <div className={styles.breakdownHead}>
                        <span>자원</span>
                        <span>칩</span>
                        <span>카드</span>
                        <span>합계</span>
                      </div>
                      {TOKEN_ORDER.map((token) => (
                        <div key={`breakdown-${token}`} className={styles.breakdownRow}>
                          <span className={styles.breakdownLabel}>
                            <i className={styles.dot} data-color={token} />
                            {gemLabel(token)}
                          </span>
                          <span>{tokensOnly(player, token)}</span>
                          <span>{bonusesOnly(player, token)}</span>
                          <span>{totalPowerByColor(player, token)}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {totalTokens >= 8 ? (
                    <div className={styles.tokenWarning}>
                      <strong>토큰 한도 임박</strong>
                      <p>턴 종료 시 최대 10칩입니다. 초과하면 남는 칩을 버려야 합니다.</p>
                    </div>
                  ) : null}
                </div>
              </BaseDrawerPreview.Content>
            </BaseDrawerPreview.Popup>
          </div>
        </div>
      </BaseDrawerPreview.Portal>
    </BaseDrawerPreview.Root>
  );
}
