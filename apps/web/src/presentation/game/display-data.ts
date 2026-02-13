import type { GemColor, PlayerState, TokenColor } from "@repo/shared-types";

export type MarketTier = 1 | 2 | 3;

export interface DisplayCost {
  color: GemColor;
  amount: number;
}

export interface CardVisual {
  bonus: GemColor;
  cost: DisplayCost[];
  points: number;
  tier: MarketTier;
}

export interface NobleVisual {
  points: number;
  requirement: DisplayCost[];
}

export const GEM_ORDER: readonly GemColor[] = [
  "ruby",
  "sapphire",
  "emerald",
  "diamond",
  "onyx",
];

export const TOKEN_ORDER: readonly TokenColor[] = [...GEM_ORDER, "gold"];

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickGem(seed: number, offset: number): GemColor {
  return GEM_ORDER[(seed + offset) % GEM_ORDER.length] ?? "ruby";
}

function buildTierCost(seed: number, tier: MarketTier): DisplayCost[] {
  const slotCountByTier: Record<MarketTier, number> = {
    1: 2,
    2: 2,
    3: 3,
  };

  const baseByTier: Record<MarketTier, number> = {
    1: 1,
    2: 2,
    3: 3,
  };

  const slots = slotCountByTier[tier];
  const base = baseByTier[tier];
  const cost: DisplayCost[] = [];

  for (let index = 0; index < slots; index += 1) {
    const color = pickGem(seed, index * 3);
    const amount = base + ((seed >> (index * 3)) % 3);
    if (cost.some((item) => item.color === color)) {
      continue;
    }
    cost.push({ color, amount });
  }

  if (cost.length === 0) {
    cost.push({ color: "ruby", amount: base });
  }

  return cost;
}

export function inferTier(cardId: string): MarketTier {
  if (cardId.includes("tier-3") || cardId.includes("tier3") || cardId.includes("t3")) {
    return 3;
  }

  if (cardId.includes("tier-2") || cardId.includes("tier2") || cardId.includes("t2")) {
    return 2;
  }

  if (cardId.includes("tier-1") || cardId.includes("tier1") || cardId.includes("t1")) {
    return 1;
  }

  const hashed = hashText(cardId);
  const roll = (hashed % 3) + 1;
  return roll as MarketTier;
}

export function getCardVisual(cardId: string, explicitTier?: MarketTier): CardVisual {
  const tier = explicitTier ?? inferTier(cardId);
  const seed = hashText(cardId);

  const bonus = pickGem(seed, tier);
  const pointsRangeByTier: Record<MarketTier, [number, number]> = {
    1: [0, 1],
    2: [1, 3],
    3: [3, 5],
  };

  const [minPoints, maxPoints] = pointsRangeByTier[tier];
  const points = minPoints + (seed % (maxPoints - minPoints + 1));

  return {
    bonus,
    cost: buildTierCost(seed, tier),
    points,
    tier,
  };
}

export function getNobleVisual(nobleId: string): NobleVisual {
  const seed = hashText(nobleId);
  const requirement: DisplayCost[] = [];

  for (let index = 0; index < 3; index += 1) {
    const color = pickGem(seed, index * 5);
    if (requirement.some((item) => item.color === color)) {
      continue;
    }
    requirement.push({
      color,
      amount: index === 2 && seed % 2 === 0 ? 4 : 3,
    });
  }

  return {
    points: 3,
    requirement,
  };
}

export function totalPowerByColor(player: PlayerState | null, color: TokenColor): number {
  if (!player) {
    return 0;
  }

  if (color === "gold") {
    return player.tokens.gold;
  }

  return player.tokens[color] + player.bonuses[color];
}

export function canAffordCost(player: PlayerState | null, cost: readonly DisplayCost[]): boolean {
  if (!player) {
    return false;
  }

  let deficit = 0;
  for (const item of cost) {
    const power = totalPowerByColor(player, item.color);
    if (power < item.amount) {
      deficit += item.amount - power;
    }
  }

  return deficit <= player.tokens.gold;
}

export function gemLabel(color: TokenColor): string {
  switch (color) {
    case "ruby":
      return "Ruby";
    case "sapphire":
      return "Sapphire";
    case "emerald":
      return "Emerald";
    case "diamond":
      return "Diamond";
    case "onyx":
      return "Onyx";
    case "gold":
      return "Gold";
    default:
      return color;
  }
}
