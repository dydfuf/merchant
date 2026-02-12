import type { NobleId, TokenColor } from "./player.state.js";

export type DeckTier = 1 | 2 | 3;
export type MarketCardId = string;

export interface BoardState {
  bankTokens: Record<TokenColor, number>;
  openMarketCardIds: Record<DeckTier, MarketCardId[]>;
  openNobleIds: NobleId[];
}
