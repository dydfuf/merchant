import type { GameState, PlayerState } from "@repo/shared-types";

import { DEVELOPMENT_CARDS } from "../card-market/card.catalog.js";
import { NOBLE_TILES } from "../nobles/noble.catalog.js";
import {
  policyFailure,
  policySuccess,
  type PolicyResult,
} from "../policy-error-code.js";

export const TARGET_SCORE = 15;

const CARD_BY_ID = new Map(DEVELOPMENT_CARDS.map((card) => [card.id, card] as const));
const NOBLE_BY_ID = new Map(NOBLE_TILES.map((noble) => [noble.id, noble] as const));

export interface PlayerScoreBreakdown {
  cardPoints: number;
  noblePoints: number;
  total: number;
}

export interface PlayerScorePolicyValue {
  playerId: string;
  score: number;
  reachedTarget: boolean;
  breakdown: PlayerScoreBreakdown;
}

export interface WinnerResolutionPolicyValue {
  winnerPlayerIds: string[];
  finalScores: Record<string, number>;
  highestScore: number;
  tieBrokenByCardCount: boolean;
}

export function hasReachedTargetScore(
  score: number,
  targetScore: number = TARGET_SCORE,
): boolean {
  return score >= targetScore;
}

export function calculatePlayerScore(
  player: PlayerState,
): PolicyResult<PlayerScoreBreakdown> {
  let cardPoints = 0;
  for (const cardId of player.purchasedCardIds) {
    const card = CARD_BY_ID.get(cardId);
    if (!card) {
      return policyFailure("SCORING_CARD_NOT_FOUND");
    }
    cardPoints += card.points;
  }

  let noblePoints = 0;
  for (const nobleId of player.nobleIds) {
    const noble = NOBLE_BY_ID.get(nobleId);
    if (!noble) {
      return policyFailure("SCORING_NOBLE_NOT_FOUND");
    }
    noblePoints += noble.points;
  }

  return policySuccess({
    cardPoints,
    noblePoints,
    total: cardPoints + noblePoints,
  });
}

export function evaluatePlayerScore(
  state: GameState,
  playerId: string,
  targetScore: number = TARGET_SCORE,
): PolicyResult<PlayerScorePolicyValue> {
  const player = state.players[playerId];
  if (!player) {
    return policyFailure("SCORING_PLAYER_NOT_FOUND");
  }

  const scoreResult = calculatePlayerScore(player);
  if (!scoreResult.ok) {
    return scoreResult;
  }

  return policySuccess({
    playerId,
    score: scoreResult.value.total,
    reachedTarget: hasReachedTargetScore(scoreResult.value.total, targetScore),
    breakdown: scoreResult.value,
  });
}

export function buildFinalScores(
  state: GameState,
): PolicyResult<Record<string, number>> {
  const finalScores: Record<string, number> = {};

  for (const playerId of Object.keys(state.players)) {
    const scoreResult = evaluatePlayerScore(state, playerId);
    if (!scoreResult.ok) {
      return scoreResult;
    }
    finalScores[playerId] = scoreResult.value.score;
  }

  return policySuccess(finalScores);
}

export function resolveGameWinners(
  state: GameState,
  providedFinalScores?: Record<string, number>,
): PolicyResult<WinnerResolutionPolicyValue> {
  const playerIds = Object.keys(state.players);
  if (playerIds.length === 0) {
    return policyFailure("SCORING_NO_PLAYERS");
  }

  const finalScoresResult = providedFinalScores
    ? validateProvidedFinalScores(state, providedFinalScores)
    : buildFinalScores(state);
  if (!finalScoresResult.ok) {
    return finalScoresResult;
  }

  const finalScores = finalScoresResult.value;
  const highestScore = Math.max(
    ...playerIds.map((playerId) => finalScores[playerId] ?? 0),
  );

  const topScorePlayers = playerIds.filter(
    (playerId) => (finalScores[playerId] ?? 0) === highestScore,
  );

  let tieBrokenByCardCount = false;
  let winnerPlayerIds = topScorePlayers;
  if (topScorePlayers.length > 1) {
    const minimumCardCount = Math.min(
      ...topScorePlayers.map(
        (playerId) =>
          state.players[playerId]?.purchasedCardIds.length ?? Number.MAX_SAFE_INTEGER,
      ),
    );
    winnerPlayerIds = topScorePlayers.filter(
      (playerId) =>
        (state.players[playerId]?.purchasedCardIds.length ?? Number.MAX_SAFE_INTEGER) ===
        minimumCardCount,
    );
    tieBrokenByCardCount = winnerPlayerIds.length < topScorePlayers.length;
  }

  if (winnerPlayerIds.length === 0) {
    return policyFailure("SCORING_TIEBREAKER_UNRESOLVED");
  }

  winnerPlayerIds.sort((left, right) => left.localeCompare(right));
  return policySuccess({
    winnerPlayerIds,
    finalScores,
    highestScore,
    tieBrokenByCardCount,
  });
}

function validateProvidedFinalScores(
  state: GameState,
  providedFinalScores: Record<string, number>,
): PolicyResult<Record<string, number>> {
  const playerIds = Object.keys(state.players);
  for (const playerId of playerIds) {
    if (!Object.hasOwn(providedFinalScores, playerId)) {
      return policyFailure("SCORING_FINAL_SCORES_INVALID");
    }
  }

  const playerIdSet = new Set(playerIds);
  for (const providedPlayerId of Object.keys(providedFinalScores)) {
    if (!playerIdSet.has(providedPlayerId)) {
      return policyFailure("SCORING_FINAL_SCORES_INVALID");
    }
  }

  return policySuccess(providedFinalScores);
}
