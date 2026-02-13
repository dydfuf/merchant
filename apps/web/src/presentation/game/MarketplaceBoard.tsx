import type { GameState, PlayerState } from "@repo/shared-types";

import {
  canAffordCost,
  gemLabel,
  getCardVisual,
  getNobleVisual,
  type MarketTier,
} from "./display-data";
import { GemSupplyBar } from "./GemSupplyBar";
import styles from "./GameScreen.module.css";

interface MarketplaceBoardProps {
  gameState: GameState | null;
  activePlayer: PlayerState | null;
  userId: string;
  connectionState: string;
  onTakeTokens(): void;
  onOpenRivals(): void;
  onOpenVault(): void;
  onOpenCardDetail(cardId: string): void;
  onGoVictory(): void;
}

const MARKET_TIERS: readonly MarketTier[] = [3, 2, 1];
const VISIBLE_CARD_LIMIT: Record<MarketTier, number> = {
  3: 2,
  2: 3,
  1: 4,
};

function toInitials(playerId: string): string {
  const normalized = playerId.replace(/^@/, "").trim();
  if (!normalized) {
    return "??";
  }

  return normalized.slice(0, 2).toUpperCase();
}

function toConnectionLabel(connectionState: string): string {
  switch (connectionState) {
    case "connected":
      return "12m ago";
    case "connecting":
      return "syncing";
    default:
      return "offline";
  }
}

export function MarketplaceBoard({
  gameState,
  activePlayer,
  userId,
  connectionState,
  onTakeTokens,
  onOpenRivals,
  onOpenVault,
  onOpenCardDetail,
  onGoVictory,
}: MarketplaceBoardProps) {
  const players = Object.values(gameState?.players ?? {});
  const rivals = players.filter((player) => player.id !== userId).slice(0, 2);

  return (
    <>
      <header className={styles.rivalsBar}>
        <div className={styles.rivalsSummary}>
          <div className={styles.rivalsAvatars}>
            {rivals.map((player) => (
              <div key={player.id} className={styles.avatarDisc}>
                {toInitials(player.id)}
              </div>
            ))}
            {rivals.length === 0 ? <div className={styles.avatarDisc}>AI</div> : null}
          </div>
          <div>
            <p className={styles.rivalsLabel}>Rivals</p>
                    <p className={styles.rivalsMeta}>Turn {gameState?.turn ?? "-"} • {toConnectionLabel(connectionState)}</p>
                  </div>
                </div>

        <div className={styles.youSummary}>
          <p className={styles.youLabel}>You</p>
          <p className={styles.youScore}>{activePlayer?.score ?? 0} VP</p>
          <button className={styles.iconButton} onClick={onOpenRivals} type="button">
            ▾
          </button>
        </div>
      </header>

      <main className={styles.marketMain}>
        <section className={styles.noblesSection}>
          <div className={styles.sectionHeadingRow}>
            <h2>Nobles</h2>
            <span>Goal: 15 VP</span>
          </div>

          <div className={styles.noblesRow}>
            {gameState?.board.openNobleIds.slice(0, 3).map((nobleId) => {
              const noble = getNobleVisual(nobleId);

              return (
                <button
                  key={nobleId}
                  className={styles.nobleTile}
                  onClick={() => {
                    onOpenCardDetail(nobleId);
                  }}
                  type="button"
                >
                  <div className={styles.nobleTop}>
                    <strong>{noble.points}</strong>
                    <span>♛</span>
                  </div>

                  <div className={styles.nobleCostList}>
                    {noble.requirement.map((item) => (
                      <div key={`${nobleId}-${item.color}`} className={styles.nobleCostItem}>
                        <span className={styles.dot} data-color={item.color} />
                        <b>{item.amount}</b>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}

            {(gameState?.board.openNobleIds.length ?? 0) === 0 ? (
              <p className={styles.empty}>현재 공개된 귀족 타일이 없습니다.</p>
            ) : null}
          </div>
        </section>

        {MARKET_TIERS.map((tier) => {
          const cardIds = (gameState?.board.openMarketCardIds[tier] ?? []).slice(
            0,
            VISIBLE_CARD_LIMIT[tier],
          );

          return (
            <section key={tier} className={styles.tierSection}>
              <div className={styles.sectionHeadingRow}>
                <h2>Tier {tier === 1 ? "I" : tier === 2 ? "II" : "III"}</h2>
                <div className={styles.sectionRule} />
              </div>

              <div className={styles.tierGrid} data-tier={tier}>
                {cardIds.map((cardId) => {
                  const card = getCardVisual(cardId, tier);
                  const affordable = canAffordCost(activePlayer, card.cost);
                  const pips = card.cost.flatMap((costItem) =>
                    Array.from({ length: costItem.amount }, () => costItem.color),
                  );
                  const visiblePips = pips.slice(0, 7);

                  return (
                    <button
                      key={cardId}
                      className={styles.marketCard}
                      data-affordable={affordable}
                      onClick={() => {
                        onOpenCardDetail(cardId);
                      }}
                      type="button"
                    >
                      <div className={styles.cardStripe} data-color={card.bonus} />

                      <div className={styles.cardCore}>
                        <strong className={styles.cardPoints}>{card.points}</strong>
                      </div>

                      <div className={styles.cardCostPips}>
                        {visiblePips.map((color, index) => (
                          <span
                            key={`${cardId}-${color}-${index}`}
                            className={styles.dot}
                            data-color={color}
                            title={gemLabel(color)}
                          />
                        ))}
                      </div>

                      <div className={styles.cardBadge}>
                        {affordable ? "check" : "lock"}
                      </div>
                    </button>
                  );
                })}

                {cardIds.length === 0 ? (
                  <p className={styles.empty}>현재 티어 {tier} 카드가 없습니다.</p>
                ) : null}
              </div>
            </section>
          );
        })}

        {gameState?.status === "ENDED" ? (
          <section className={styles.commandTray}>
            <button className={styles.commandSubtleButton} onClick={onGoVictory} type="button">
              Victory
            </button>
          </section>
        ) : null}
      </main>

      <GemSupplyBar
        bankTokens={gameState?.board.bankTokens ?? null}
        onOpenVault={onOpenVault}
        onTakeTokens={onTakeTokens}
      />
    </>
  );
}
