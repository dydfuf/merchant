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

export function createTokenWallet(
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

export function createBonusWallet(
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

export function createPlayer(
  id: string,
  overrides: Partial<PlayerState> = {},
): PlayerState {
  const basePlayer: PlayerState = {
    id,
    score: 0,
    tokens: createTokenWallet(),
    bonuses: createBonusWallet(),
    reservedCardIds: [],
    purchasedCardIds: [],
    nobleIds: [],
  };

  return {
    ...basePlayer,
    ...overrides,
    tokens: {
      ...basePlayer.tokens,
      ...overrides.tokens,
    },
    bonuses: {
      ...basePlayer.bonuses,
      ...overrides.bonuses,
    },
    reservedCardIds: overrides.reservedCardIds
      ? [...overrides.reservedCardIds]
      : [...basePlayer.reservedCardIds],
    purchasedCardIds: overrides.purchasedCardIds
      ? [...overrides.purchasedCardIds]
      : [...basePlayer.purchasedCardIds],
    nobleIds: overrides.nobleIds ? [...overrides.nobleIds] : [...basePlayer.nobleIds],
  };
}

export function createPlayers(...players: PlayerState[]): Record<string, PlayerState> {
  return Object.fromEntries(players.map((player) => [player.id, player]));
}

export function createBoardState(overrides: Partial<BoardState> = {}): BoardState {
  const baseOpenMarket: Record<DeckTier, string[]> = {
    1: ["t1-01", "t1-02", "t1-03", "t1-04"],
    2: ["t2-01", "t2-02", "t2-03", "t2-04"],
    3: ["t3-01", "t3-02", "t3-03", "t3-04"],
  };

  const baseBoard: BoardState = {
    bankTokens: createTokenWallet({
      diamond: 7,
      sapphire: 7,
      emerald: 7,
      ruby: 7,
      onyx: 7,
      gold: 5,
    }),
    openMarketCardIds: baseOpenMarket,
    openNobleIds: ["noble-01", "noble-02", "noble-03"],
  };

  const openMarketCardIds = DECK_TIERS.reduce(
    (acc, tier) => {
      const overrideCards = overrides.openMarketCardIds?.[tier];
      acc[tier] = overrideCards ? [...overrideCards] : [...baseBoard.openMarketCardIds[tier]];
      return acc;
    },
    {} as Record<DeckTier, string[]>,
  );

  return {
    ...baseBoard,
    ...overrides,
    bankTokens: {
      ...baseBoard.bankTokens,
      ...overrides.bankTokens,
    },
    openMarketCardIds,
    openNobleIds: overrides.openNobleIds
      ? [...overrides.openNobleIds]
      : [...baseBoard.openNobleIds],
  };
}

interface GameStateOverrides extends Omit<Partial<GameState>, "board" | "players"> {
  board?: Partial<BoardState>;
  players?: Record<string, PlayerState>;
}

export function createGameState(overrides: GameStateOverrides = {}): GameState {
  const defaultPlayers = createPlayers(createPlayer("p1"), createPlayer("p2"));
  const {
    board: boardOverrides,
    players: playerOverrides,
    ...restOverrides
  } = overrides;

  const state: GameState = {
    gameId: "game-1",
    version: 1,
    status: "IN_PROGRESS",
    seed: "seed-1",
    currentPlayerId: "p1",
    turn: 1,
    finalRound: false,
    board: createBoardState(),
    players: defaultPlayers,
    ...restOverrides,
  };

  state.board = createBoardState(boardOverrides);
  state.players = playerOverrides ?? defaultPlayers;
  return state;
}
