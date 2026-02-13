import type { BoardState } from "@repo/shared-types";

import { TOKEN_ORDER } from "./display-data";
import styles from "./GameScreen.module.css";

interface GemSupplyBarProps {
  bankTokens: BoardState["bankTokens"] | null;
  onTakeTokens(): void;
  onOpenVault(): void;
}

export function GemSupplyBar({ bankTokens, onTakeTokens, onOpenVault }: GemSupplyBarProps) {
  return (
    <footer className={styles.supplyDock}>
      <div className={styles.supplyActionWrap}>
        <button className={styles.supplyActionButton} onClick={onTakeTokens} type="button">
          <span>보석 3개 가져오기</span>
          <span>{">"}</span>
        </button>
      </div>

      <div className={styles.supplyPanel}>
        <div className={styles.supplyRow}>
          {TOKEN_ORDER.map((token) => (
            <button key={token} className={styles.supplyGem} data-color={token} type="button">
              {bankTokens?.[token] ?? 0}
            </button>
          ))}
        </div>

        <button className={styles.vaultHandle} onClick={onOpenVault} type="button" />
      </div>
    </footer>
  );
}
