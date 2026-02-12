import { describe, expect, it } from "vitest";

import {
  evaluateEndTurn,
  evaluateFinalRoundTrigger,
} from "../../src/domain/turn/turn.policy.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
} from "../helpers/state.factory.js";

describe("턴 정책", () => {
  it("다음 플레이어와 라운드 메타데이터를 계산한다", () => {
    const state = createGameState({
      currentPlayerId: "p1",
      turn: 4,
    });

    const result = evaluateEndTurn(state, "p1", ["p1", "p2"]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      previousPlayerId: "p1",
      nextPlayerId: "p2",
      turnNumber: 5,
      roundNumber: 3,
      shouldEndGame: false,
      gameEndedReason: undefined,
    });
  });

  it("파이널 라운드가 트리거 플레이어로 돌아오면 게임 종료를 표시한다", () => {
    const state = createGameState({
      currentPlayerId: "p2",
      finalRound: true,
      endTriggeredByPlayerId: "p1",
    });

    const result = evaluateEndTurn(state, "p2", ["p1", "p2"]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.shouldEndGame).toBe(true);
    expect(result.value.gameEndedReason).toBe("NO_MORE_ROUNDS");
    expect(result.value.nextPlayerId).toBe("p1");
  });

  it("현재 턴이 아닌 플레이어를 거부한다", () => {
    const state = createGameState({
      currentPlayerId: "p1",
    });

    const result = evaluateEndTurn(state, "p2", ["p1", "p2"]);
    expect(result).toEqual({
      ok: false,
      code: "TURN_NOT_CURRENT_PLAYER",
    });
  });

  it("잘못된 플레이어 순서를 거부한다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1"),
        createPlayer("p2"),
        createPlayer("p3"),
      ),
      currentPlayerId: "p1",
    });

    const result = evaluateEndTurn(state, "p1", ["p1", "p2"]);
    expect(result).toEqual({
      ok: false,
      code: "TURN_PLAYER_ORDER_INVALID",
    });
  });

  it("현재 플레이어가 목표 점수에 도달하면 파이널 라운드를 시작한다", () => {
    const state = createGameState({
      currentPlayerId: "p1",
      turn: 8,
      finalRound: false,
    });

    const result = evaluateFinalRoundTrigger(state, "p1", 15);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({
      shouldTriggerFinalRound: true,
      endTriggeredAtTurn: 8,
      endTriggeredByPlayerId: "p1",
    });
  });

  it("파이널 라운드가 이미 활성화되면 다시 시작하지 않는다", () => {
    const state = createGameState({
      finalRound: true,
      endTriggeredByPlayerId: "p1",
    });

    const result = evaluateFinalRoundTrigger(state, "p1", 20);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value).toEqual({
      shouldTriggerFinalRound: false,
    });
  });
});
