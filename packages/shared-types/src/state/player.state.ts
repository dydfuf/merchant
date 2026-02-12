export type TokenColor =
  | "diamond"
  | "sapphire"
  | "emerald"
  | "ruby"
  | "onyx"
  | "gold";

export type GemColor = Exclude<TokenColor, "gold">;

export type PlayerTokenWallet = Record<TokenColor, number>;
export type PlayerBonusWallet = Record<GemColor, number>;

export type ReservedCardId = string;
export type PurchasedCardId = string;
export type NobleId = string;

export interface PlayerState {
  id: string;
  score: number;
  tokens: PlayerTokenWallet;
  bonuses: PlayerBonusWallet;
  reservedCardIds: ReservedCardId[];
  purchasedCardIds: PurchasedCardId[];
  nobleIds: NobleId[];
}
