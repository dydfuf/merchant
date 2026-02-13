"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildGameHref } from "../../lib/routes";
import { toKoreanErrorMessage } from "../i18n/error-message";
import { KO_TEXT } from "../i18n/ko";
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
    label: "@DesignGod, @MeepleMaster와 대전",
    turn: 12,
    playerCount: 3,
    tab: "your-turn",
    statusKey: "your-turn",
    statusLabel: KO_TEXT.lobby.status.yourTurn,
  },
  {
    id: "preview-your-turn-02",
    label: "@CryptoKing과 대전",
    turn: 8,
    playerCount: 2,
    tab: "your-turn",
    statusKey: "expiring",
    statusLabel: KO_TEXT.lobby.status.expiring,
  },
  {
    id: "preview-waiting-01",
    label: "@GuildMaster와 대전",
    turn: 3,
    playerCount: 4,
    tab: "waiting",
    statusKey: "waiting",
    statusLabel: KO_TEXT.lobby.status.waiting,
  },
  {
    id: "preview-completed-01",
    label: "@TableTopTitan과 대전",
    turn: 24,
    playerCount: 2,
    tab: "completed",
    statusKey: "completed",
    statusLabel: KO_TEXT.lobby.status.completed,
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
            <h1>머천트</h1>
          </div>
          <button
            className={styles.profileButton}
            onClick={() => {
              router.push("/auth/login");
            }}
            type="button"
          >
            로그아웃
          </button>
        </header>

        <LobbyTabs active={tab} onChange={setTab} />

        <main className={styles.listPanel}>
          <p className={styles.listHeader}>진행 중인 매치</p>
          <GameList
            games={filteredGames}
            onOpen={(game) => {
              void handleOpenGame(game);
            }}
          />
        </main>

        <footer className={styles.controlPanel}>
          <label className={styles.field}>
            <span>사용자 ID</span>
            <input
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
              }}
            />
          </label>

          <label className={styles.field}>
            <span>게임 ID로 참가</span>
            <input
              value={joinGameId}
              onChange={(event) => {
                setJoinGameId(event.target.value);
              }}
              placeholder="예: merchant-local-..."
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={pending} onClick={handleCreateGame} type="button">
              게임 생성
            </button>
            <button
              className={styles.secondaryButton}
              disabled={pending}
              onClick={() => {
                void handleJoinGame(joinGameId);
              }}
              type="button"
            >
              게임 참가
            </button>
          </div>

          {error ? <p className={styles.error}>{toKoreanErrorMessage(error)}</p> : null}
        </footer>
      </div>
    </section>
  );
}
