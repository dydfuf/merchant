import {
  DEVELOPMENT_CARDS,
  NOBLE_TILES,
  PLAYER_SETUP_BY_COUNT,
  type SupportedPlayerCount,
} from "@repo/rule-engine";
import type {
  DeckTier,
  GameId,
  GameState,
  GemColor,
  PlayerState,
  TokenColor,
} from "@repo/shared-types";

import type { SeedGameContextInput } from "./in-memory-command-handler.repo.js";

const GEM_COLORS: readonly GemColor[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
];
const TOKEN_COLORS: readonly TokenColor[] = [...GEM_COLORS, "gold"];

export interface CreateLocalGameContextInput {
  gameId: GameId;
  playerIds: readonly string[];
  seed: string;
}

export function createLocalGameContext(
  input: CreateLocalGameContextInput,
): SeedGameContextInput {
  const playerIds = validatePlayerIds(input.playerIds);
  const firstPlayerId = playerIds[0];
  if (!firstPlayerId) {
    throw new Error("FIRST_PLAYER_NOT_FOUND");
  }
  const playerCount = playerIds.length as SupportedPlayerCount;
  const setup = PLAYER_SETUP_BY_COUNT[playerCount];

  const deckCardIdsByTier = buildDeckCardIdsByTier();
  const openNobleIds = NOBLE_TILES.slice(0, setup.revealedNobles).map(
    (noble) => noble.id,
  );

  const state: GameState = {
    gameId: input.gameId,
    version: 1,
    status: "IN_PROGRESS",
    seed: input.seed,
    currentPlayerId: firstPlayerId,
    turn: 1,
    finalRound: false,
    board: {
      bankTokens: createBankTokenWallet({
        gemTokensPerColor: setup.gemTokensPerColor,
        goldTokens: setup.goldTokens,
      }),
      openMarketCardIds: {
        1: [...deckCardIdsByTier[1].slice(0, 4)],
        2: [...deckCardIdsByTier[2].slice(0, 4)],
        3: [...deckCardIdsByTier[3].slice(0, 4)],
      },
      openNobleIds,
    },
    players: buildPlayers(playerIds),
  };

  return {
    gameId: input.gameId,
    state,
    playerOrder: playerIds,
    deckCardIdsByTier,
  };
}

function validatePlayerIds(playerIds: readonly string[]): string[] {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("PLAYER_COUNT_MUST_BE_2_TO_4");
  }

  const normalized = playerIds.map((id) => id.trim());
  for (const id of normalized) {
    if (id.length === 0) {
      throw new Error("PLAYER_ID_EMPTY");
    }
  }

  const uniqueIds = new Set(normalized);
  if (uniqueIds.size !== normalized.length) {
    throw new Error("PLAYER_IDS_MUST_BE_UNIQUE");
  }

  return normalized;
}

function buildDeckCardIdsByTier(): Record<DeckTier, readonly string[]> {
  return {
    1: DEVELOPMENT_CARDS.filter((card) => card.tier === 1).map(
      (card) => card.id,
    ),
    2: DEVELOPMENT_CARDS.filter((card) => card.tier === 2).map(
      (card) => card.id,
    ),
    3: DEVELOPMENT_CARDS.filter((card) => card.tier === 3).map(
      (card) => card.id,
    ),
  };
}

function buildPlayers(playerIds: readonly string[]): Record<string, PlayerState> {
  return Object.fromEntries(
    playerIds.map((playerId) => [playerId, createEmptyPlayerState(playerId)]),
  );
}

function createEmptyPlayerState(playerId: string): PlayerState {
  return {
    id: playerId,
    score: 0,
    tokens: createZeroTokenWallet(),
    bonuses: createZeroBonusWallet(),
    reservedCardIds: [],
    purchasedCardIds: [],
    nobleIds: [],
  };
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

function createZeroBonusWallet(): Record<GemColor, number> {
  return GEM_COLORS.reduce(
    (wallet, color) => {
      wallet[color] = 0;
      return wallet;
    },
    {} as Record<GemColor, number>,
  );
}

function createBankTokenWallet(input: {
  gemTokensPerColor: number;
  goldTokens: number;
}): Record<TokenColor, number> {
  return TOKEN_COLORS.reduce(
    (wallet, color) => {
      wallet[color] = color === "gold" ? input.goldTokens : input.gemTokensPerColor;
      return wallet;
    },
    {} as Record<TokenColor, number>,
  );
}
