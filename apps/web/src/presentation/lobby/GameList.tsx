import styles from "./Lobby.module.css";

import type { LobbyTab } from "./LobbyTabs";
import {
  resolveLobbyStatusLabel,
  type LobbyStatusKey,
} from "./status-label";

export interface LobbyGameItem {
  id: string;
  label: string;
  turn: number;
  playerCount: number;
  tab: LobbyTab;
  statusKey: LobbyStatusKey;
  statusLabel: string;
}

interface GameListProps {
  games: LobbyGameItem[];
  onOpen(game: LobbyGameItem): void;
}

export function GameList({ games, onOpen }: GameListProps) {
  if (games.length === 0) {
    return <p className={styles.empty}>현재 조건에 맞는 게임이 없습니다.</p>;
  }

  return (
    <ul className={styles.list}>
      {games.map((game, index) => (
        <li key={game.id}>
          <button
            className={styles.gameItem}
            data-status={game.statusKey}
            type="button"
            onClick={() => {
              onOpen(game);
            }}
          >
            <div className={styles.avatarStack} aria-hidden="true">
              <span />
              <span />
              <span>{Math.max(0, game.playerCount - 2)}</span>
            </div>

            <div className={styles.gameInfo}>
              <p className={styles.gameTitle}>{game.label}</p>
              <p className={styles.gameMeta}>턴 {game.turn} • {game.playerCount}명</p>
            </div>

            <span className={styles.statusPill} data-status={game.statusKey}>
              {resolveLobbyStatusLabel(game.statusKey, game.statusLabel, index)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
