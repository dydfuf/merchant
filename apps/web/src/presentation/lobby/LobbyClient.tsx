"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildGameHref } from "../../lib/routes";
import { createGame, getGame } from "../../lib/game-client";
import { GameList, type LobbyGameItem } from "./GameList";
import { LobbyTabs, type LobbyTab } from "./LobbyTabs";
import styles from "./Lobby.module.css";

interface LobbyClientProps {
  initialUserId: string;
}

const MOCK_GAMES: LobbyGameItem[] = [
  {
    id: "preview-your-turn-01",
    label: "vs. @DesignGod & @MeepleMaster",
    turn: 12,
    playerCount: 3,
    tab: "your-turn",
    statusText: "Your Turn",
  },
  {
    id: "preview-your-turn-02",
    label: "vs. @CryptoKing",
    turn: 8,
    playerCount: 2,
    tab: "your-turn",
    statusText: "Expiring",
  },
  {
    id: "preview-waiting-01",
    label: "vs. @GuildMaster",
    turn: 3,
    playerCount: 4,
    tab: "waiting",
    statusText: "Waiting",
  },
  {
    id: "preview-completed-01",
    label: "vs. @TableTopTitan",
    turn: 24,
    playerCount: 2,
    tab: "completed",
    statusText: "Completed",
  },
];

export function LobbyClient({ initialUserId }: LobbyClientProps) {
  const router = useRouter();

  const [userId, setUserId] = useState(initialUserId);
  const [joinGameId, setJoinGameId] = useState("");
  const [tab, setTab] = useState<LobbyTab>("your-turn");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredGames = useMemo(
    () => MOCK_GAMES.filter((game) => game.tab === tab),
    [tab],
  );

  async function handleCreateGame() {
    setPending(true);
    setError(null);

    try {
      const created = await createGame({
        playerIds: [userId, "player-2"],
      });
      router.push(buildGameHref(created.gameId, userId));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "GAME_CREATE_FAILED";
      if (message.includes("HTTP_401") || message.includes("HTTP_403")) {
        router.push("/auth/denied");
        return;
      }
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function handleJoinGame(targetId: string) {
    const normalized = targetId.trim();
    if (!normalized) {
      setError("GAME_ID_REQUIRED");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const loaded = await getGame(normalized);
      router.push(buildGameHref(loaded.gameId, userId));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "GAME_LOAD_FAILED";
      if (message.includes("HTTP_401") || message.includes("HTTP_403")) {
        router.push("/auth/denied");
        return;
      }
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function handleOpenGame(game: LobbyGameItem) {
    if (game.id.startsWith("preview-")) {
      await handleCreateGame();
      return;
    }

    await handleJoinGame(game.id);
  }

  return (
    <section className={styles.page}>
      <div className={styles.phoneShell}>
        <header className={styles.header}>
          <div className={styles.logoWrap}>
            <span className={styles.logoMark}>◆</span>
            <h1>MERCHANT</h1>
          </div>
          <button
            className={styles.profileButton}
            onClick={() => {
              router.push("/auth/login");
            }}
            type="button"
          >
            Sign Out
          </button>
        </header>

        <LobbyTabs active={tab} onChange={setTab} />

        <main className={styles.listPanel}>
          <p className={styles.listHeader}>Active Trades</p>
          <GameList
            games={filteredGames}
            onOpen={(game) => {
              void handleOpenGame(game);
            }}
          />
        </main>

        <footer className={styles.controlPanel}>
          <label className={styles.field}>
            <span>User ID</span>
            <input
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
              }}
            />
          </label>

          <label className={styles.field}>
            <span>Join by Game ID</span>
            <input
              value={joinGameId}
              onChange={(event) => {
                setJoinGameId(event.target.value);
              }}
              placeholder="merchant-local-..."
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={pending} onClick={handleCreateGame} type="button">
              Create Game
            </button>
            <button
              className={styles.secondaryButton}
              disabled={pending}
              onClick={() => {
                void handleJoinGame(joinGameId);
              }}
              type="button"
            >
              Join Game
            </button>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
        </footer>
      </div>
    </section>
  );
}
