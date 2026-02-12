import type { GameEndedReason, GameState } from "@repo/shared-types";

import {
  policyFailure,
  policySuccess,
  type PolicyResult,
} from "../policy-error-code.js";

export interface EndTurnPolicyValue {
  previousPlayerId: string;
  nextPlayerId: string;
  turnNumber: number;
  roundNumber: number;
  shouldEndGame: boolean;
  gameEndedReason?: GameEndedReason;
}

export interface FinalRoundTriggerPolicyValue {
  shouldTriggerFinalRound: boolean;
  endTriggeredAtTurn?: number;
  endTriggeredByPlayerId?: string;
}

export function evaluateEndTurn(
  state: GameState,
  actorId: string,
  playerOrder: readonly string[],
): PolicyResult<EndTurnPolicyValue> {
  const ownershipCheck = assertCurrentPlayer(state, actorId);
  if (!ownershipCheck.ok) {
    return ownershipCheck;
  }

  if (!isValidPlayerOrder(state, playerOrder)) {
    return policyFailure("TURN_PLAYER_ORDER_INVALID");
  }

  const currentIndex = playerOrder.indexOf(state.currentPlayerId);
  if (currentIndex === -1) {
    return policyFailure("TURN_PLAYER_ORDER_INVALID");
  }

  const nextIndex = (currentIndex + 1) % playerOrder.length;
  const nextPlayerId = playerOrder[nextIndex];
  if (!nextPlayerId) {
    return policyFailure("TURN_PLAYER_ORDER_INVALID");
  }

  const turnNumber = state.turn + 1;
  const roundNumber = Math.floor((turnNumber - 1) / playerOrder.length) + 1;

  const shouldEndGame = shouldGameEndAfterFinalRound(state, nextPlayerId);

  return policySuccess({
    previousPlayerId: state.currentPlayerId,
    nextPlayerId,
    turnNumber,
    roundNumber,
    shouldEndGame,
    gameEndedReason: shouldEndGame ? "NO_MORE_ROUNDS" : undefined,
  });
}

export function evaluateFinalRoundTrigger(
  state: GameState,
  actorId: string,
  actorScore: number,
  targetScore: number = 15,
): PolicyResult<FinalRoundTriggerPolicyValue> {
  const ownershipCheck = assertCurrentPlayer(state, actorId);
  if (!ownershipCheck.ok) {
    return ownershipCheck;
  }

  if (state.finalRound) {
    return policySuccess({ shouldTriggerFinalRound: false });
  }

  if (actorScore < targetScore) {
    return policySuccess({ shouldTriggerFinalRound: false });
  }

  return policySuccess({
    shouldTriggerFinalRound: true,
    endTriggeredAtTurn: state.turn,
    endTriggeredByPlayerId: actorId,
  });
}

export function shouldGameEndAfterFinalRound(
  state: GameState,
  nextPlayerId: string,
): boolean {
  return Boolean(
    state.finalRound &&
      state.endTriggeredByPlayerId &&
      nextPlayerId === state.endTriggeredByPlayerId,
  );
}

function assertCurrentPlayer(
  state: GameState,
  actorId: string,
): PolicyResult<{ actorId: string }> {
  if (state.currentPlayerId !== actorId) {
    return policyFailure("TURN_NOT_CURRENT_PLAYER");
  }

  return policySuccess({ actorId });
}

function isValidPlayerOrder(
  state: GameState,
  playerOrder: readonly string[],
): boolean {
  if (playerOrder.length === 0) {
    return false;
  }

  const distinctPlayerOrder = new Set(playerOrder);
  if (distinctPlayerOrder.size !== playerOrder.length) {
    return false;
  }

  const playerIds = Object.keys(state.players);
  if (playerIds.length !== playerOrder.length) {
    return false;
  }

  return playerIds.every((playerId) => distinctPlayerOrder.has(playerId));
}
