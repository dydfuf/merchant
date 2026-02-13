"use client";

import { useEffect, useRef, useState } from "react";
import type { Command, GameState } from "@repo/shared-types";

import { createIdempotencyKey } from "../../lib/idempotency";
import {
  connectGameSocket,
  createGame,
  getGame,
  sendCommand,
  type GameSocketHandle,
  type GameSocketMessage,
} from "../../lib/game-client";
import { toKoreanErrorMessage } from "../i18n/error-message";
import styles from "./local-runtime.module.css";

type ConnectionState = "disconnected" | "connecting" | "connected";

export function LocalRuntimeConsole() {
  const socketRef = useRef<GameSocketHandle | null>(null);

  const [userId, setUserId] = useState("player-1");
  const [gameIdInput, setGameIdInput] = useState("");
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    "disconnected",
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string>("-");

  useEffect(() => {
    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setConnectionState("disconnected");
  }, [userId]);

  const activePlayer = gameState?.players[userId] ?? null;

  async function ensureSocket(): Promise<GameSocketHandle> {
    if (socketRef.current) {
      return socketRef.current;
    }

    setConnectionState("connecting");

    const socket = connectGameSocket({
      userId,
      onOpen: () => {
        setConnectionState("connected");
      },
      onClose: () => {
        setConnectionState("disconnected");
      },
      onError: (error) => {
        setServerError(error);
      },
      onMessage: (message) => {
        handleSocketMessage(message);
      },
    });

    socketRef.current = socket;
    return socket;
  }

  function handleSocketMessage(message: GameSocketMessage): void {
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
      return;
    }
  }

  async function handleConnect(): Promise<void> {
    setServerError(null);
    await ensureSocket();
  }

  async function handleCreateGame(): Promise<void> {
    setServerError(null);

    try {
      const created = await createGame({
        playerIds: ["player-1", "player-2"],
      });

      setActiveGameId(created.gameId);
      setGameIdInput(created.gameId);
      setGameState(created.state);

      const socket = await ensureSocket();
      socket.subscribe(created.gameId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "GAME_CREATE_FAILED";
      setServerError(message);
    }
  }

  async function handleJoinGame(): Promise<void> {
    const targetGameId = gameIdInput.trim();
    if (!targetGameId) {
      setServerError("GAME_ID_REQUIRED");
      return;
    }

    setServerError(null);

    try {
      const loaded = await getGame(targetGameId);

      setActiveGameId(loaded.gameId);
      setGameState(loaded.state);

      const socket = await ensureSocket();
      socket.subscribe(loaded.gameId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "GAME_LOAD_FAILED";
      setServerError(message);
    }
  }

  async function submitCommand(
    commandFactory: (state: GameState) => Command,
  ): Promise<void> {
    if (!activeGameId || !gameState) {
      setServerError("GAME_NOT_READY");
      return;
    }

    setServerError(null);

    try {
      const command = commandFactory(gameState);
      const response = await sendCommand(activeGameId, command, userId);

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
        const details = response.result.details ? ` (${response.result.details})` : "";
        setServerError(`${reason}${details}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "COMMAND_SEND_FAILED";
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

  async function handleBuyReservedCard(): Promise<void> {
    if (!gameState) {
      setServerError("GAME_NOT_READY");
      return;
    }

    const reservedCardId = gameState.players[userId]?.reservedCardIds[0];
    if (!reservedCardId) {
      setServerError("NO_RESERVED_CARD");
      return;
    }

    await submitCommand((state) => ({
      type: "BUY_CARD",
      gameId: state.gameId,
      actorId: userId,
      expectedVersion: state.version,
      idempotencyKey: createIdempotencyKey("buy"),
      payload: {
        source: {
          kind: "RESERVED",
          cardId: reservedCardId,
        },
        payment: {
          diamond: 1,
          sapphire: 1,
          emerald: 1,
        },
      },
    }));
  }

  async function handleEndTurn(): Promise<void> {
    await submitCommand((state) => ({
      type: "END_TURN",
      gameId: state.gameId,
      actorId: userId,
      expectedVersion: state.version,
      idempotencyKey: createIdempotencyKey("end-turn"),
      payload: {
        reason: "ACTION_COMPLETED",
      },
    }));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>머천트 로컬 런타임</h1>
        <p>인메모리 레지스트리 기반 로컬 실게임 루프</p>
      </header>

      <section className={styles.panel}>
        <h2>세션</h2>
        <label className={styles.field}>
          <span>사용자 ID</span>
          <input
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
            }}
          />
        </label>

        <div className={styles.row}>
          <button className={styles.button} onClick={handleConnect}>
            WS 연결
          </button>
          <button className={styles.button} onClick={handleCreateGame}>
            게임 생성
          </button>
        </div>

        <label className={styles.field}>
          <span>게임 ID</span>
          <input
            value={gameIdInput}
            onChange={(event) => {
              setGameIdInput(event.target.value);
            }}
          />
        </label>

        <button className={styles.button} onClick={handleJoinGame}>
          게임 참가
        </button>

        <dl className={styles.meta}>
          <div>
            <dt>연결 상태</dt>
            <dd>
              {connectionState === "connected"
                ? "연결됨"
                : connectionState === "connecting"
                  ? "연결 중"
                  : "끊김"}
            </dd>
          </div>
          <div>
            <dt>활성 게임</dt>
            <dd>{activeGameId ?? "-"}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.panel}>
        <h2>명령</h2>
        <div className={styles.gridButtons}>
          <button className={styles.button} onClick={handleTakeTokens}>
            토큰 획득 (TAKE_TOKENS)
          </button>
          <button className={styles.button} onClick={handleReserveCard}>
            카드 예약 (RESERVE_CARD)
          </button>
          <button className={styles.button} onClick={handleBuyReservedCard}>
            카드 구매 (BUY_CARD)
          </button>
          <button className={styles.button} onClick={handleEndTurn}>
            턴 종료 (END_TURN)
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>게임 상태</h2>
        {gameState ? (
          <div className={styles.state}>
            <p>
              <strong>상태:</strong> {gameState.status}
            </p>
            <p>
              <strong>버전:</strong> {gameState.version}
            </p>
            <p>
              <strong>턴:</strong> {gameState.turn}
            </p>
            <p>
              <strong>현재 플레이어:</strong> {gameState.currentPlayerId}
            </p>
            <p>
              <strong>티어1 공개 카드:</strong>{" "}
              {gameState.board.openMarketCardIds[1].join(", ") || "-"}
            </p>
            <p>
              <strong>내 예약 카드:</strong>{" "}
              {activePlayer?.reservedCardIds.join(", ") || "-"}
            </p>
            <p>
              <strong>내 토큰:</strong> {countWallet(activePlayer?.tokens)}
            </p>
            <p>
              <strong>내 보너스:</strong> {countWallet(activePlayer?.bonuses)}
            </p>
          </div>
        ) : (
          <p>불러온 게임이 없습니다</p>
        )}
      </section>

      <section className={styles.panel}>
        <h2>결과</h2>
        <pre className={styles.result}>{lastResult}</pre>
        {serverError ? (
          <p className={styles.error}>{toKoreanErrorMessage(serverError)}</p>
        ) : null}
      </section>
    </div>
  );
}

function countWallet(wallet: Record<string, number> | undefined): number {
  if (!wallet) {
    return 0;
  }

  return Object.values(wallet).reduce((sum, amount) => sum + amount, 0);
}
