import type {
  BuyCardCommand,
  CardBoughtEvent,
  CardReservedEvent,
  Command,
  DeckTier,
  EndTurnCommand,
  GameEndedEvent,
  GameEvent,
  GameState,
  GemColor,
  ReserveCardCommand,
  TakeTokensCommand,
  TokenColor,
  TokensTakenEvent,
  TurnEndedEvent,
} from "@repo/shared-types";

import { validateCommandEnvelope } from "./validate-command.js";
import {
  evaluateBuySource,
  evaluateReserveCard,
  getDevelopmentCardById,
  selectDeckTopCardDeterministically,
} from "../domain/card-market/card-market.policy.js";
import {
  applyTokenDeltaWithLimit,
  evaluateBuyPayment,
  evaluateTakeTokens,
} from "../domain/economy/economy.policy.js";
import { evaluateNobleVisit } from "../domain/nobles/nobles.policy.js";
import {
  evaluatePlayerScore,
  resolveGameWinners,
} from "../domain/scoring/scoring.policy.js";
import {
  evaluateEndTurn,
  evaluateFinalRoundTrigger,
} from "../domain/turn/turn.policy.js";
import type { PolicyErrorCode } from "../domain/policy-error-code.js";

const GEM_COLORS: readonly GemColor[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
];
const TOKEN_COLORS: readonly TokenColor[] = [...GEM_COLORS, "gold"];

export interface ApplyCommandInput {
  state: GameState;
  command: Command;
  playerOrder: readonly string[];
  deckCardIdsByTier: Partial<Record<DeckTier, readonly string[]>>;
}

export type ApplyCommandFailureCode =
  | "COMMAND_ENVELOPE_INVALID"
  | "POLICY_VIOLATION"
  | "STATE_NOT_ACTIVE"
  | "STATE_INVARIANT_BROKEN"
  | "TRANSITION_BUILD_FAILED";

export interface ApplyCommandSuccess {
  ok: true;
  events: GameEvent[];
  nextState: GameState;
}

export interface ApplyCommandFailure {
  ok: false;
  code: ApplyCommandFailureCode;
  policyCode?: PolicyErrorCode;
  reason?: string;
}

export type ApplyCommandResult = ApplyCommandSuccess | ApplyCommandFailure;

type TransitionResult = ApplyCommandResult;

export function applyCommand(input: ApplyCommandInput): ApplyCommandResult {
  const preflightFailure = validatePreflight(input);
  if (preflightFailure) {
    return preflightFailure;
  }

  const transitionResult = executeTransition(input);
  if (!transitionResult.ok) {
    return transitionResult;
  }

  return validateTransitionOutcome(input.state, transitionResult);
}

function validatePreflight(input: ApplyCommandInput): ApplyCommandFailure | null {
  const { state, command } = input;

  const envelope = validateCommandEnvelope({
    type: command.type,
    actorId: command.actorId,
    expectedVersion: command.expectedVersion,
    idempotencyKey: command.idempotencyKey,
    payload: command.payload as Record<string, unknown>,
  });
  if (!envelope.ok) {
    return transitionFailure("COMMAND_ENVELOPE_INVALID", envelope.reason);
  }

  if (state.status !== "IN_PROGRESS") {
    return transitionFailure("STATE_NOT_ACTIVE", "STATE_NOT_IN_PROGRESS");
  }

  if (command.gameId !== state.gameId) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "GAME_ID_MISMATCH");
  }

  if (command.type !== "END_TURN" && state.currentPlayerId !== command.actorId) {
    return policyViolation("TURN_NOT_CURRENT_PLAYER");
  }

  return null;
}

function executeTransition(input: ApplyCommandInput): TransitionResult {
  const { command } = input;

  switch (command.type) {
    case "TAKE_TOKENS":
      return applyTakeTokensTransition(input, command);
    case "RESERVE_CARD":
      return applyReserveCardTransition(input, command);
    case "BUY_CARD":
      return applyBuyCardTransition(input, command);
    case "END_TURN":
      return applyEndTurnTransition(input, command);
    default:
      return assertNever(command);
  }
}

function applyTakeTokensTransition(
  input: ApplyCommandInput,
  command: TakeTokensCommand,
): TransitionResult {
  const takeResult = evaluateTakeTokens(
    input.state,
    command.actorId,
    command.payload,
  );
  if (!takeResult.ok) {
    return policyViolation(takeResult.code);
  }

  const nextState = cloneGameState(input.state);
  const actor = nextState.players[command.actorId];
  if (!actor) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "ACTOR_NOT_FOUND");
  }

  actor.tokens = { ...takeResult.value.walletAfter };
  nextState.board.bankTokens = { ...takeResult.value.bankAfter };

  const nextVersion = input.state.version + 1;
  const event: TokensTakenEvent = {
    type: "TOKENS_TAKEN",
    gameId: command.gameId,
    actorId: command.actorId,
    version: nextVersion,
    payload: {
      tokens: toPositiveGemRecord(takeResult.value.takenTokens),
    },
  };

  nextState.version = nextVersion;
  return transitionSuccess([event], nextState);
}

function applyReserveCardTransition(
  input: ApplyCommandInput,
  command: ReserveCardCommand,
): TransitionResult {
  const deckTopCardIdsByTier =
    command.payload.target.kind === "DECK_TOP"
      ? resolveDeckTopTarget(input, command.payload.target.tier)
      : {
          ok: true as const,
          value: {} as Partial<Record<DeckTier, string>>,
        };

  if (!deckTopCardIdsByTier.ok) {
    return deckTopCardIdsByTier;
  }

  const reserveResult = evaluateReserveCard(
    input.state,
    command.actorId,
    command.payload,
    {
      deckTopCardIdsByTier: deckTopCardIdsByTier.value,
    },
  );
  if (!reserveResult.ok) {
    return policyViolation(reserveResult.code);
  }

  const openCardDeckContext =
    reserveResult.value.targetKind === "OPEN_CARD"
      ? requireDeckContextForTier(input.deckCardIdsByTier, reserveResult.value.tier)
      : null;
  if (openCardDeckContext && !openCardDeckContext.ok) {
    return openCardDeckContext;
  }

  const actor = input.state.players[command.actorId];
  if (!actor) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "ACTOR_NOT_FOUND");
  }

  const reserveTokenDelta = applyTokenDeltaWithLimit({
    playerTokens: actor.tokens,
    bankTokens: input.state.board.bankTokens,
    gainedTokens: {
      gold: reserveResult.value.goldToTake,
    },
    returnedTokens: command.payload.returnedTokens,
  });
  if (!reserveTokenDelta.ok) {
    return policyViolation(reserveTokenDelta.code);
  }

  const nextState = cloneGameState(input.state);
  const nextActor = nextState.players[command.actorId];
  if (!nextActor) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "ACTOR_NOT_FOUND");
  }

  nextActor.tokens = { ...reserveTokenDelta.value.walletAfter };
  nextState.board.bankTokens = { ...reserveTokenDelta.value.bankAfter };
  nextActor.reservedCardIds = [
    ...nextActor.reservedCardIds,
    reserveResult.value.cardId,
  ];

  if (reserveResult.value.targetKind === "OPEN_CARD") {
    const removeAndRefillResult = removeOpenCardAndRefill({
      state: nextState,
      tier: reserveResult.value.tier,
      cardId: reserveResult.value.cardId,
      deckCardIds: openCardDeckContext?.value ?? [],
      drawSeed: input.state.seed,
      drawVersion: input.state.version,
    });
    if (removeAndRefillResult) {
      return removeAndRefillResult;
    }
  }

  const nextVersion = input.state.version + 1;
  const event: CardReservedEvent = {
    type: "CARD_RESERVED",
    gameId: command.gameId,
    actorId: command.actorId,
    version: nextVersion,
    payload: {
      targetKind: reserveResult.value.targetKind,
      cardId: reserveResult.value.cardId,
      tier: reserveResult.value.tier,
      grantedGold: reserveResult.value.grantedGold,
    },
  };

  nextState.version = nextVersion;
  return transitionSuccess([event], nextState);
}

function applyBuyCardTransition(
  input: ApplyCommandInput,
  command: BuyCardCommand,
): TransitionResult {
  const scoreBeforeResult = evaluatePlayerScore(input.state, command.actorId);
  if (!scoreBeforeResult.ok) {
    return policyViolation(scoreBeforeResult.code);
  }

  const sourceResult = evaluateBuySource(
    input.state,
    command.actorId,
    command.payload.source,
  );
  if (!sourceResult.ok) {
    return policyViolation(sourceResult.code);
  }

  const card = getDevelopmentCardById(sourceResult.value.cardId);
  if (!card) {
    return policyViolation("MARKET_CARD_UNKNOWN");
  }

  const actor = input.state.players[command.actorId];
  if (!actor) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "ACTOR_NOT_FOUND");
  }

  const paymentResult = evaluateBuyPayment({
    playerTokens: actor.tokens,
    playerBonuses: actor.bonuses,
    cardCost: card.cost,
    payment: command.payload.payment,
  });
  if (!paymentResult.ok) {
    return policyViolation(paymentResult.code);
  }

  const openMarketDeckContext =
    sourceResult.value.sourceKind === "OPEN_MARKET"
      ? requireDeckContextForTier(input.deckCardIdsByTier, sourceResult.value.tier)
      : null;
  if (openMarketDeckContext && !openMarketDeckContext.ok) {
    return openMarketDeckContext;
  }

  const nextState = cloneGameState(input.state);
  const nextActor = nextState.players[command.actorId];
  if (!nextActor) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "ACTOR_NOT_FOUND");
  }

  nextActor.tokens = { ...paymentResult.value.remainingTokens };
  nextState.board.bankTokens = addTokenWallet(
    nextState.board.bankTokens,
    paymentResult.value.spentTokens,
  );
  nextActor.purchasedCardIds = [...nextActor.purchasedCardIds, sourceResult.value.cardId];

  if (sourceResult.value.sourceKind === "OPEN_MARKET") {
    const removeAndRefillResult = removeOpenCardAndRefill({
      state: nextState,
      tier: sourceResult.value.tier,
      cardId: sourceResult.value.cardId,
      deckCardIds: openMarketDeckContext?.value ?? [],
      drawSeed: input.state.seed,
      drawVersion: input.state.version,
    });
    if (removeAndRefillResult) {
      return removeAndRefillResult;
    }
  } else {
    const reservedIndex = nextActor.reservedCardIds.indexOf(sourceResult.value.cardId);
    if (reservedIndex < 0) {
      return transitionFailure(
        "STATE_INVARIANT_BROKEN",
        "RESERVED_CARD_NOT_FOUND",
      );
    }
    nextActor.reservedCardIds.splice(reservedIndex, 1);
  }
  nextActor.bonuses = {
    ...nextActor.bonuses,
    [card.bonus]: nextActor.bonuses[card.bonus] + 1,
  };

  const nobleResult = evaluateNobleVisit(nextState, command.actorId);
  if (!nobleResult.ok) {
    return policyViolation(nobleResult.code);
  }

  if (nobleResult.value.grantedNobleId) {
    const nobleIndex = nextState.board.openNobleIds.indexOf(
      nobleResult.value.grantedNobleId,
    );
    if (nobleIndex < 0) {
      return transitionFailure("STATE_INVARIANT_BROKEN", "NOBLE_NOT_FOUND");
    }

    nextState.board.openNobleIds.splice(nobleIndex, 1);
    nextActor.nobleIds = [...nextActor.nobleIds, nobleResult.value.grantedNobleId];
  }

  const scoreAfterResult = evaluatePlayerScore(nextState, command.actorId);
  if (!scoreAfterResult.ok) {
    return policyViolation(scoreAfterResult.code);
  }

  nextActor.score = scoreAfterResult.value.score;

  const finalRoundTrigger = evaluateFinalRoundTrigger(
    nextState,
    command.actorId,
    scoreAfterResult.value.score,
  );
  if (!finalRoundTrigger.ok) {
    return policyViolation(finalRoundTrigger.code);
  }

  if (finalRoundTrigger.value.shouldTriggerFinalRound) {
    if (
      typeof finalRoundTrigger.value.endTriggeredAtTurn !== "number" ||
      typeof finalRoundTrigger.value.endTriggeredByPlayerId !== "string"
    ) {
      return transitionFailure(
        "STATE_INVARIANT_BROKEN",
        "FINAL_ROUND_METADATA_MISSING",
      );
    }

    nextState.finalRound = true;
    nextState.endTriggeredAtTurn = finalRoundTrigger.value.endTriggeredAtTurn;
    nextState.endTriggeredByPlayerId =
      finalRoundTrigger.value.endTriggeredByPlayerId;
  }

  const nextVersion = input.state.version + 1;
  const event: CardBoughtEvent = {
    type: "CARD_BOUGHT",
    gameId: command.gameId,
    actorId: command.actorId,
    version: nextVersion,
    payload: {
      cardId: sourceResult.value.cardId,
      spentTokens: toPositiveTokenRecord(paymentResult.value.spentTokens),
      gainedBonusColor: card.bonus,
      scoreDelta: scoreAfterResult.value.score - scoreBeforeResult.value.score,
    },
  };

  nextState.version = nextVersion;
  return transitionSuccess([event], nextState);
}

function applyEndTurnTransition(
  input: ApplyCommandInput,
  command: EndTurnCommand,
): TransitionResult {
  const endTurnResult = evaluateEndTurn(
    input.state,
    command.actorId,
    input.playerOrder,
  );
  if (!endTurnResult.ok) {
    return policyViolation(endTurnResult.code);
  }

  const nextState = cloneGameState(input.state);
  nextState.turn = endTurnResult.value.turnNumber;
  nextState.currentPlayerId = endTurnResult.value.nextPlayerId;

  const turnEndedVersion = input.state.version + 1;
  const turnEndedEvent: TurnEndedEvent = {
    type: "TURN_ENDED",
    gameId: command.gameId,
    actorId: command.actorId,
    version: turnEndedVersion,
    payload: {
      previousPlayerId: endTurnResult.value.previousPlayerId,
      nextPlayerId: endTurnResult.value.nextPlayerId,
      turnNumber: endTurnResult.value.turnNumber,
      roundNumber: endTurnResult.value.roundNumber,
    },
  };

  const events: GameEvent[] = [turnEndedEvent];

  if (endTurnResult.value.shouldEndGame) {
    if (
      typeof input.state.endTriggeredAtTurn !== "number" ||
      typeof input.state.endTriggeredByPlayerId !== "string"
    ) {
      return transitionFailure(
        "STATE_INVARIANT_BROKEN",
        "GAME_END_METADATA_MISSING",
      );
    }

    const winnerResult = resolveGameWinners(nextState);
    if (!winnerResult.ok) {
      return policyViolation(winnerResult.code);
    }

    const gameEndedVersion = turnEndedVersion + 1;
    const gameEndedEvent: GameEndedEvent = {
      type: "GAME_ENDED",
      gameId: command.gameId,
      actorId: command.actorId,
      version: gameEndedVersion,
      payload: {
        winnerPlayerIds: winnerResult.value.winnerPlayerIds,
        finalScores: winnerResult.value.finalScores,
        reason: endTurnResult.value.gameEndedReason ?? "NO_MORE_ROUNDS",
        endTriggeredAtTurn: input.state.endTriggeredAtTurn,
        endTriggeredByPlayerId: input.state.endTriggeredByPlayerId,
      },
    };

    events.push(gameEndedEvent);

    nextState.status = "ENDED";
    nextState.winnerPlayerIds = [...winnerResult.value.winnerPlayerIds];

    for (const [playerId, score] of Object.entries(winnerResult.value.finalScores)) {
      const player = nextState.players[playerId];
      if (player) {
        player.score = score;
      }
    }

    nextState.version = gameEndedVersion;
    return transitionSuccess(events, nextState);
  }

  nextState.version = turnEndedVersion;
  return transitionSuccess(events, nextState);
}

function resolveDeckTopTarget(
  input: ApplyCommandInput,
  tier: DeckTier,
):
  | {
      ok: true;
      value: Partial<Record<DeckTier, string>>;
    }
  | ApplyCommandFailure {
  const deckContext = requireDeckContextForTier(input.deckCardIdsByTier, tier);
  if (!deckContext.ok) {
    return deckContext;
  }

  const deckCardIds = deckContext.value;
  const availableDeckCards = getAvailableDeckCardIds(input.state, tier, deckCardIds);

  const deckSelection = selectDeckTopCardDeterministically({
    seed: input.state.seed,
    version: input.state.version,
    tier,
    deckCardIds: availableDeckCards,
  });
  if (!deckSelection.ok) {
    return policyViolation(deckSelection.code);
  }

  return {
    ok: true,
    value: {
      [tier]: deckSelection.value.cardId,
    },
  };
}

interface RemoveOpenCardAndRefillInput {
  state: GameState;
  tier: DeckTier;
  cardId: string;
  deckCardIds: readonly string[];
  drawSeed: string;
  drawVersion: number;
}

function removeOpenCardAndRefill(
  input: RemoveOpenCardAndRefillInput,
): ApplyCommandFailure | null {
  const tierCards = input.state.board.openMarketCardIds[input.tier];
  const removedIndex = tierCards.indexOf(input.cardId);
  if (removedIndex < 0) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "OPEN_CARD_NOT_FOUND");
  }

  tierCards.splice(removedIndex, 1);

  const availableDeckCards = getAvailableDeckCardIds(
    input.state,
    input.tier,
    input.deckCardIds,
  ).filter((cardId) => cardId !== input.cardId);
  if (availableDeckCards.length === 0) {
    return null;
  }

  const drawResult = selectDeckTopCardDeterministically({
    seed: input.drawSeed,
    version: input.drawVersion,
    tier: input.tier,
    deckCardIds: availableDeckCards,
  });
  if (!drawResult.ok) {
    return policyViolation(drawResult.code);
  }

  tierCards.splice(removedIndex, 0, drawResult.value.cardId);
  return null;
}

function getAvailableDeckCardIds(
  state: GameState,
  tier: DeckTier,
  deckCardIds: readonly string[],
): string[] {
  const unavailableCardIds = new Set<string>(state.board.openMarketCardIds[tier]);

  for (const player of Object.values(state.players)) {
    for (const cardId of player.reservedCardIds) {
      unavailableCardIds.add(cardId);
    }
    for (const cardId of player.purchasedCardIds) {
      unavailableCardIds.add(cardId);
    }
  }

  return deckCardIds.filter((cardId) => !unavailableCardIds.has(cardId));
}

function requireDeckContextForTier(
  deckCardIdsByTier: Partial<Record<DeckTier, readonly string[]>>,
  tier: DeckTier,
):
  | {
      ok: true;
      value: readonly string[];
    }
  | ApplyCommandFailure {
  const deckCardIds = deckCardIdsByTier[tier];
  if (!deckCardIds) {
    return transitionFailure("STATE_INVARIANT_BROKEN", "DECK_CONTEXT_REQUIRED");
  }

  return {
    ok: true,
    value: deckCardIds,
  };
}

function validateTransitionOutcome(
  previousState: GameState,
  result: ApplyCommandSuccess,
): ApplyCommandResult {
  if (result.events.length === 0) {
    return transitionFailure("TRANSITION_BUILD_FAILED", "EVENTS_EMPTY");
  }

  let expectedVersion = previousState.version + 1;
  for (const event of result.events) {
    if (event.gameId !== previousState.gameId) {
      return transitionFailure(
        "TRANSITION_BUILD_FAILED",
        "EVENT_GAME_ID_MISMATCH",
      );
    }

    if (event.version !== expectedVersion) {
      return transitionFailure(
        "TRANSITION_BUILD_FAILED",
        "EVENT_VERSION_SEQUENCE_INVALID",
      );
    }
    expectedVersion += 1;
  }

  const lastEvent = result.events[result.events.length - 1];
  if (!lastEvent) {
    return transitionFailure("TRANSITION_BUILD_FAILED", "LAST_EVENT_MISSING");
  }

  if (result.nextState.version !== lastEvent.version) {
    return transitionFailure(
      "TRANSITION_BUILD_FAILED",
      "STATE_VERSION_MISMATCH",
    );
  }

  if (result.nextState.gameId !== previousState.gameId) {
    return transitionFailure(
      "TRANSITION_BUILD_FAILED",
      "STATE_GAME_ID_MISMATCH",
    );
  }

  if (!Object.hasOwn(result.nextState.players, result.nextState.currentPlayerId)) {
    return transitionFailure(
      "TRANSITION_BUILD_FAILED",
      "CURRENT_PLAYER_NOT_IN_PLAYERS",
    );
  }

  return result;
}

function transitionSuccess(
  events: GameEvent[],
  nextState: GameState,
): ApplyCommandSuccess {
  return {
    ok: true,
    events,
    nextState,
  };
}

function transitionFailure(
  code: ApplyCommandFailureCode,
  reason?: string,
): ApplyCommandFailure {
  return {
    ok: false,
    code,
    reason,
  };
}

function policyViolation(
  policyCode: PolicyErrorCode,
  reason?: string,
): ApplyCommandFailure {
  return {
    ok: false,
    code: "POLICY_VIOLATION",
    policyCode,
    reason,
  };
}

function toPositiveGemRecord(
  tokens: Record<GemColor, number>,
): Partial<Record<GemColor, number>> {
  const result: Partial<Record<GemColor, number>> = {};
  for (const color of GEM_COLORS) {
    const amount = tokens[color];
    if (amount > 0) {
      result[color] = amount;
    }
  }
  return result;
}

function toPositiveTokenRecord(
  tokens: Record<TokenColor, number>,
): Partial<Record<TokenColor, number>> {
  const result: Partial<Record<TokenColor, number>> = {};
  for (const color of TOKEN_COLORS) {
    const amount = tokens[color];
    if (amount > 0) {
      result[color] = amount;
    }
  }
  return result;
}

function addTokenWallet(
  base: Record<TokenColor, number>,
  delta: Record<TokenColor, number>,
): Record<TokenColor, number> {
  const nextWallet = createZeroTokenWallet();
  for (const color of TOKEN_COLORS) {
    nextWallet[color] = base[color] + delta[color];
  }
  return nextWallet;
}

function createZeroTokenWallet(): Record<TokenColor, number> {
  return TOKEN_COLORS.reduce(
    (wallet, color) => {
      wallet[color] = 0;
      return wallet;
    },
    {} as Record<TokenColor, number>,
  );
}

function cloneGameState(state: GameState): GameState {
  const clonedPlayers: GameState["players"] = {};
  for (const [playerId, player] of Object.entries(state.players)) {
    clonedPlayers[playerId] = {
      ...player,
      tokens: { ...player.tokens },
      bonuses: { ...player.bonuses },
      reservedCardIds: [...player.reservedCardIds],
      purchasedCardIds: [...player.purchasedCardIds],
      nobleIds: [...player.nobleIds],
    };
  }

  return {
    ...state,
    board: {
      ...state.board,
      bankTokens: { ...state.board.bankTokens },
      openMarketCardIds: {
        1: [...state.board.openMarketCardIds[1]],
        2: [...state.board.openMarketCardIds[2]],
        3: [...state.board.openMarketCardIds[3]],
      },
      openNobleIds: [...state.board.openNobleIds],
    },
    players: clonedPlayers,
    winnerPlayerIds: state.winnerPlayerIds
      ? [...state.winnerPlayerIds]
      : undefined,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected command: ${JSON.stringify(value)}`);
}
