import styles from "./Lobby.module.css";

import type { LobbyTab } from "./LobbyTabs";

export interface LobbyGameItem {
  id: string;
  label: string;
  turn: number;
  playerCount: number;
  tab: LobbyTab;
  statusText: string;
}

interface GameListProps {
  games: LobbyGameItem[];
  onOpen(game: LobbyGameItem): void;
}

export function GameList({ games, onOpen }: GameListProps) {
  if (games.length === 0) {
    return <p className={styles.empty}>현재 조건에 맞는 매치가 없습니다.</p>;
  }

  return (
    <ul className={styles.list}>
      {games.map((game, index) => (
        <li key={game.id}>
          <button
            className={styles.gameItem}
            data-status={game.statusText.toLowerCase().replace(/\s+/g, "-")}
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
              <p className={styles.gameMeta}>Turn {game.turn} • {game.playerCount} Players</p>
            </div>

            <span className={styles.statusPill} data-status={game.statusText.toLowerCase().replace(/\s+/g, "-")}>
              {index === 0 && game.statusText === "Your Turn" ? "Your Turn" : game.statusText}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
