import type {
  BuyCardCommand,
  DeckTier,
  GameState,
  ReserveCardCommand,
} from "@repo/shared-types";

import type { DevelopmentCardCatalogEntry } from "./card.catalog.js";
import { DEVELOPMENT_CARDS } from "./card.catalog.js";
import {
  policyFailure,
  policySuccess,
  type PolicyResult,
} from "../policy-error-code.js";

const RESERVED_CARD_LIMIT = 3;
const TIERS: readonly DeckTier[] = [1, 2, 3];

const CARD_BY_ID = new Map(
  DEVELOPMENT_CARDS.map((card) => [card.id, card] as const),
);

export interface ReserveCardEvaluationContext {
  deckTopCardIdsByTier?: Partial<Record<DeckTier, string>>;
}

export interface ReserveCardPolicyValue {
  cardId: string;
  tier: DeckTier;
  targetKind: "OPEN_CARD" | "DECK_TOP";
  grantedGold: boolean;
  goldToTake: number;
  requiresRefill: boolean;
}

export interface BuySourcePolicyValue {
  cardId: string;
  tier: DeckTier;
  sourceKind: BuyCardCommand["payload"]["source"]["kind"];
  requiresRefill: boolean;
}

export interface DeterministicDeckTopInput {
  seed: string;
  version: number;
  tier: DeckTier;
  deckCardIds: readonly string[];
}

export interface DeterministicDeckTopResult {
  cardId: string;
  index: number;
}

export function getDevelopmentCardById(
  cardId: string,
): DevelopmentCardCatalogEntry | undefined {
  return CARD_BY_ID.get(cardId);
}

export function evaluateReserveCard(
  state: GameState,
  actorId: string,
  payload: ReserveCardCommand["payload"],
  context: ReserveCardEvaluationContext = {},
): PolicyResult<ReserveCardPolicyValue> {
  const player = state.players[actorId];
  if (!player) {
    return policyFailure("MARKET_PLAYER_NOT_FOUND");
  }

  if (player.reservedCardIds.length >= RESERVED_CARD_LIMIT) {
    return policyFailure("MARKET_RESERVE_LIMIT_REACHED");
  }

  if (payload.target.kind === "OPEN_CARD") {
    const { cardId, tier } = payload.target;
    if (!state.board.openMarketCardIds[tier].includes(cardId)) {
      return policyFailure("MARKET_CARD_NOT_AVAILABLE");
    }

    const card = CARD_BY_ID.get(cardId);
    if (!card) {
      return policyFailure("MARKET_CARD_UNKNOWN");
    }
    if (card.tier !== tier) {
      return policyFailure("MARKET_CARD_TIER_MISMATCH");
    }

    const grantedGold = payload.takeGoldToken && state.board.bankTokens.gold > 0;
    return policySuccess({
      cardId,
      tier,
      targetKind: "OPEN_CARD",
      grantedGold,
      goldToTake: grantedGold ? 1 : 0,
      requiresRefill: true,
    });
  }

  const deckTopId = context.deckTopCardIdsByTier?.[payload.target.tier];
  if (!deckTopId) {
    return policyFailure("MARKET_DECK_EMPTY");
  }

  const card = CARD_BY_ID.get(deckTopId);
  if (!card) {
    return policyFailure("MARKET_CARD_UNKNOWN");
  }
  if (card.tier !== payload.target.tier) {
    return policyFailure("MARKET_CARD_TIER_MISMATCH");
  }

  const grantedGold = payload.takeGoldToken && state.board.bankTokens.gold > 0;
  return policySuccess({
    cardId: deckTopId,
    tier: payload.target.tier,
    targetKind: "DECK_TOP",
    grantedGold,
    goldToTake: grantedGold ? 1 : 0,
    requiresRefill: false,
  });
}

export function evaluateBuySource(
  state: GameState,
  actorId: string,
  source: BuyCardCommand["payload"]["source"],
): PolicyResult<BuySourcePolicyValue> {
  const player = state.players[actorId];
  if (!player) {
    return policyFailure("MARKET_PLAYER_NOT_FOUND");
  }

  if (source.kind === "OPEN_MARKET") {
    const tier = findTierInOpenMarket(state, source.cardId);
    if (!tier) {
      return policyFailure("MARKET_CARD_NOT_AVAILABLE");
    }

    const card = CARD_BY_ID.get(source.cardId);
    if (!card) {
      return policyFailure("MARKET_CARD_UNKNOWN");
    }
    if (card.tier !== tier) {
      return policyFailure("MARKET_CARD_TIER_MISMATCH");
    }

    return policySuccess({
      cardId: source.cardId,
      tier,
      sourceKind: "OPEN_MARKET",
      requiresRefill: true,
    });
  }

  if (!player.reservedCardIds.includes(source.cardId)) {
    return policyFailure("MARKET_CARD_NOT_RESERVED");
  }

  const card = CARD_BY_ID.get(source.cardId);
  if (!card) {
    return policyFailure("MARKET_CARD_UNKNOWN");
  }

  return policySuccess({
    cardId: source.cardId,
    tier: card.tier,
    sourceKind: "RESERVED",
    requiresRefill: false,
  });
}

export function selectDeckTopCardDeterministically(
  input: DeterministicDeckTopInput,
): PolicyResult<DeterministicDeckTopResult> {
  if (input.deckCardIds.length === 0) {
    return policyFailure("MARKET_DECK_EMPTY");
  }

  const hash = fnv1a32(`${input.seed}:${input.version}:${input.tier}`);
  const index = hash % input.deckCardIds.length;
  const cardId = input.deckCardIds[index];
  if (!cardId) {
    return policyFailure("MARKET_DECK_EMPTY");
  }

  return policySuccess({
    cardId,
    index,
  });
}

function findTierInOpenMarket(state: GameState, cardId: string): DeckTier | undefined {
  return TIERS.find((tier) => state.board.openMarketCardIds[tier].includes(cardId));
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
