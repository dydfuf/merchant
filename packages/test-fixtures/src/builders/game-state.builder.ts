import type {
  BoardState,
  DeckTier,
  GameState,
  GemColor,
  PlayerState,
  TokenColor,
} from "@repo/shared-types";

const GEM_COLORS: readonly GemColor[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
];
const TOKEN_COLORS: readonly TokenColor[] = [...GEM_COLORS, "gold"];
const DECK_TIERS: readonly DeckTier[] = [1, 2, 3];

export function buildTokenWallet(
  overrides: Partial<Record<TokenColor, number>> = {},
): Record<TokenColor, number> {
  return TOKEN_COLORS.reduce(
    (wallet, color) => {
      wallet[color] = overrides[color] ?? 0;
      return wallet;
    },
    {} as Record<TokenColor, number>,
  );
}

export function buildBonusWallet(
  overrides: Partial<Record<GemColor, number>> = {},
): Record<GemColor, number> {
  return GEM_COLORS.reduce(
    (wallet, color) => {
      wallet[color] = overrides[color] ?? 0;
      return wallet;
    },
    {} as Record<GemColor, number>,
  );
}

export function buildPlayerState(
  id: string,
  overrides: Partial<PlayerState> = {},
): PlayerState {
  const base: PlayerState = {
    id,
    score: 0,
    tokens: buildTokenWallet(),
    bonuses: buildBonusWallet(),
    reservedCardIds: [],
    purchasedCardIds: [],
    nobleIds: [],
  };

  return {
    ...base,
    ...overrides,
    tokens: {
      ...base.tokens,
      ...overrides.tokens,
    },
    bonuses: {
      ...base.bonuses,
      ...overrides.bonuses,
    },
    reservedCardIds: overrides.reservedCardIds
      ? [...overrides.reservedCardIds]
      : [...base.reservedCardIds],
    purchasedCardIds: overrides.purchasedCardIds
      ? [...overrides.purchasedCardIds]
      : [...base.purchasedCardIds],
    nobleIds: overrides.nobleIds ? [...overrides.nobleIds] : [...base.nobleIds],
  };
}

export function buildPlayers(ids: readonly string[]): Record<string, PlayerState> {
  return Object.fromEntries(ids.map((id) => [id, buildPlayerState(id)]));
}

interface BuildGameStateOverrides
  extends Omit<Partial<GameState>, "board" | "players"> {
  board?: Partial<BoardState>;
  players?: Record<string, PlayerState>;
}

export function buildGameState(
  overrides: BuildGameStateOverrides = {},
): GameState {
  const base: GameState = {
    gameId: "game-fixture",
    version: 1,
    status: "IN_PROGRESS",
    seed: "fixture-seed",
    currentPlayerId: "player-1",
    turn: 1,
    finalRound: false,
    board: {
      bankTokens: buildTokenWallet({
        diamond: 7,
        sapphire: 7,
        emerald: 7,
        ruby: 7,
        onyx: 7,
        gold: 5,
      }),
      openMarketCardIds: {
        1: ["t1-01", "t1-02", "t1-03", "t1-04"],
        2: ["t2-01", "t2-02", "t2-03", "t2-04"],
        3: ["t3-01", "t3-02", "t3-03", "t3-04"],
      },
      openNobleIds: ["noble-01", "noble-02", "noble-03"],
    },
    players: buildPlayers(["player-1", "player-2"]),
  };

  const openMarketCardIds = DECK_TIERS.reduce(
    (acc, tier) => {
      const override = overrides.board?.openMarketCardIds?.[tier];
      acc[tier] = override
        ? [...override]
        : [...(base.board.openMarketCardIds[tier] ?? [])];
      return acc;
    },
    {} as Record<DeckTier, string[]>,
  );

  return {
    ...base,
    ...overrides,
    board: {
      ...base.board,
      ...overrides.board,
      bankTokens: {
        ...base.board.bankTokens,
        ...overrides.board?.bankTokens,
      },
      openMarketCardIds,
      openNobleIds: overrides.board?.openNobleIds
        ? [...overrides.board.openNobleIds]
        : [...base.board.openNobleIds],
    },
    players: overrides.players ?? base.players,
  };
}
