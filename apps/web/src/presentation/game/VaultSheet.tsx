"use client";

import { useCallback, useMemo, useState } from "react";
import type { PlayerState, TokenColor } from "@repo/shared-types";

import {
  canAffordCost,
  gemLabel,
  getCardVisual,
  TOKEN_ORDER,
  totalPowerByColor,
} from "./display-data";
import { useDialogAccessibility } from "./useDialogAccessibility";
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

  const totalTokens = useMemo(() => {
    if (!player) {
      return 0;
    }

    return Object.values(player.tokens).reduce((sum, value) => sum + value, 0);
  }, [player]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlayBackdrop}>
      <div className={styles.sheetDock}>
        <div
          aria-labelledby="vault-title"
          aria-modal="true"
          className={styles.vaultSheet}
          ref={setDialogElement}
          role="dialog"
          tabIndex={-1}
        >
          <header className={styles.vaultHeader}>
            <button className={styles.vaultDragHandle} onClick={handleClose} type="button" />

            <div className={styles.vaultHeaderRow}>
              <h2 id="vault-title">Total Buying Power</h2>
              <span>{totalTokens} / 10 Chips</span>
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
                <h3>Reserved Holdings</h3>
                <span>{player?.reservedCardIds.length ?? 0} / 3 Slots</span>
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
                          {affordable ? "Affordable" : "Cannot Afford"}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className={styles.reservedPlaceholder}>Empty Slot</div>
                )}
              </div>
            </section>

            <section className={styles.vaultSection}>
              <div className={styles.vaultSectionHeader}>
                <h3>Asset Breakdown</h3>
              </div>

              <div className={styles.breakdownTable}>
                <div className={styles.breakdownHead}>
                  <span>Resource</span>
                  <span>Chips</span>
                  <span>Cards</span>
                  <span>Total</span>
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
                <strong>Token Limit Approaching</strong>
                <p>Turn end limit is 10 chips. Discard extras if you exceed the cap.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
