"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Command, GameState, PlayerState } from "@repo/shared-types";

import { createIdempotencyKey } from "../../lib/idempotency";
import { buildGamePath } from "../../lib/routes";
import {
  connectGameSocket,
  getGame,
  sendCommand,
  type GameSocketHandle,
  type GameSocketMessage,
} from "../../lib/game-client";
import { CardDetailModal } from "./CardDetailModal";
import { MarketplaceBoard } from "./MarketplaceBoard";
import { RivalsOverlay } from "./RivalsOverlay";
import { VaultSheet } from "./VaultSheet";
import styles from "./GameScreen.module.css";

type ConnectionState = "disconnected" | "connecting" | "connected";

interface GameScreenClientProps {
  gameId: string;
  initialUserId: string;
}

export default function GameScreenClient({
  gameId,
  initialUserId,
}: GameScreenClientProps) {
  const router = useRouter();
  const socketRef = useRef<GameSocketHandle | null>(null);
  const userId = initialUserId;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    "disconnected",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState("-");

  const [openRivals, setOpenRivals] = useState(false);
  const [openVault, setOpenVault] = useState(false);
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const activePlayer: PlayerState | null = gameState?.players[userId] ?? null;

  const handleSocketMessage = useCallback((message: GameSocketMessage): void => {
    if (message.type === "ERROR") {
      setServerError(`${message.payload.code}: ${message.payload.message}`);
      return;
    }

    if (message.type === "GAME_SNAPSHOT") {
      setGameState(message.payload.state);
      return;
    }

    if (message.type === "COMMAND_RESULT") {
      setLastResult(JSON.stringify(message.payload, null, 2));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoadError(null);
      setServerError(null);

      try {
        const loaded = await getGame(gameId);
        if (cancelled) {
          return;
        }

        setGameState(loaded.state);

        const socket = connectGameSocket({
          userId,
          onOpen: () => {
            if (!cancelled) {
              setConnectionState("connected");
            }
          },
          onClose: () => {
            if (!cancelled) {
              setConnectionState("disconnected");
            }
          },
          onError: (error) => {
            if (!cancelled) {
              setServerError(error);
            }
          },
          onMessage: (message) => {
            if (!cancelled) {
              handleSocketMessage(message);
            }
          },
        });

        socketRef.current = socket;
        setConnectionState("connecting");
        socket.subscribe(gameId);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "GAME_LOAD_FAILED";
        if (!cancelled) {
          if (message.includes("HTTP_401") || message.includes("HTTP_403")) {
            router.replace("/auth/denied");
            return;
          }
          setLoadError(message);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      socketRef.current?.unsubscribe(gameId);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [gameId, handleSocketMessage, router, userId]);

  async function submitCommand(
    commandFactory: (state: GameState) => Command,
  ): Promise<void> {
    if (!gameState) {
      setServerError("GAME_NOT_READY");
      return;
    }

    setServerError(null);

    try {
      const command = commandFactory(gameState);
      const response = await sendCommand(gameId, command, userId);

      setLastResult(JSON.stringify(response, null, 2));

      if (!response.ok) {
        setServerError(`${response.reason}: ${response.message}`);
        return;
      }

      if (
        (response.result.kind === "accepted" || response.result.kind === "replayed") &&
        response.result.nextState
      ) {
        setGameState(response.result.nextState);
        return;
      }

      if (response.result.kind === "rejected") {
        const reason = response.result.reason ?? "COMMAND_REJECTED";
        setServerError(reason);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "COMMAND_SEND_FAILED";
      if (message.includes("HTTP_401") || message.includes("HTTP_403")) {
        router.replace("/auth/denied");
        return;
      }
      setServerError(message);
    }
  }

  async function handleTakeTokens(): Promise<void> {
    await submitCommand((state) => ({
      type: "TAKE_TOKENS",
      gameId: state.gameId,
      actorId: userId,
      expectedVersion: state.version,
      idempotencyKey: createIdempotencyKey("take"),
      payload: {
        tokens: {
          diamond: 1,
          sapphire: 1,
          emerald: 1,
        },
      },
    }));
  }

  async function handleReserveCard(): Promise<void> {
    if (!gameState) {
      setServerError("GAME_NOT_READY");
      return;
    }

    const firstTierCardId = gameState.board.openMarketCardIds[1][0];
    if (!firstTierCardId) {
      setServerError("NO_OPEN_TIER1_CARD");
      return;
    }

    await submitCommand((state) => ({
      type: "RESERVE_CARD",
      gameId: state.gameId,
      actorId: userId,
      expectedVersion: state.version,
      idempotencyKey: createIdempotencyKey("reserve"),
      payload: {
        target: {
          kind: "OPEN_CARD",
          cardId: firstTierCardId,
          tier: 1,
        },
        takeGoldToken: true,
      },
    }));
  }

  function handleOpenCardDetail(cardId: string) {
    setSelectedCardId(cardId);
    setIsCardDetailOpen(true);
  }

  if (loadError) {
    return (
      <div className={styles.errorPage}>
        <h1>Game Not Available</h1>
        <p>{loadError}</p>
        <button
          className={styles.commandButton}
          onClick={() => {
            router.push("/lobby");
          }}
          type="button"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.shell} id="game-shell">
        <MarketplaceBoard
          activePlayer={activePlayer}
          connectionState={connectionState}
          gameState={gameState}
          onGoVictory={() => {
            const basePath = buildGamePath(gameId);
            router.push(`${basePath}/victory?userId=${encodeURIComponent(userId)}`);
          }}
          onOpenCardDetail={handleOpenCardDetail}
          onOpenRivals={() => {
            setOpenRivals(true);
          }}
          onOpenVault={() => {
            setOpenVault(true);
          }}
          onTakeTokens={() => {
            void handleTakeTokens();
          }}
          userId={userId}
        />

        {serverError || lastResult !== "-" ? (
          <section className={styles.runtimePanel}>
            <div className={styles.runtimePanelHeader}>
              <h2>Runtime Feed</h2>
              <button
                className={styles.commandSubtleButton}
                onClick={() => {
                  router.push("/lobby");
                }}
                type="button"
              >
                Exit Match
              </button>
            </div>
            {serverError ? <p className={styles.errorText}>{serverError}</p> : null}
            <pre>{lastResult}</pre>
          </section>
        ) : null}
      </section>

      <RivalsOverlay
        currentPlayerId={gameState?.currentPlayerId ?? null}
        onClose={() => {
          setOpenRivals(false);
        }}
        open={openRivals}
        players={Object.values(gameState?.players ?? {})}
      />

      <VaultSheet
        onClose={() => {
          setOpenVault(false);
        }}
        open={openVault}
        player={activePlayer}
      />

      <CardDetailModal
        cardId={selectedCardId}
        onClose={() => {
          setIsCardDetailOpen(false);
        }}
        onReserve={() => {
          void handleReserveCard();
        }}
        open={isCardDetailOpen}
        player={activePlayer}
      />
    </div>
  );
}
