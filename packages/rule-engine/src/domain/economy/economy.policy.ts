import type {
  BuyCardCommand,
  GameState,
  GemColor,
  PlayerBonusWallet,
  PlayerTokenWallet,
  TakeTokensCommand,
  TokenColor,
} from "@repo/shared-types";

import {
  policyFailure,
  policySuccess,
  type PolicyErrorCode,
  type PolicyResult,
} from "../policy-error-code.js";

const GEM_COLORS: readonly GemColor[] = [
  "diamond",
  "sapphire",
  "emerald",
  "ruby",
  "onyx",
];
const TOKEN_COLORS: readonly TokenColor[] = [...GEM_COLORS, "gold"];

const PLAYER_TOKEN_LIMIT = 10;

type TokenWallet = Record<TokenColor, number>;
type GemWallet = Record<GemColor, number>;

export interface ApplyTokenDeltaInput {
  playerTokens: PlayerTokenWallet;
  bankTokens: Record<TokenColor, number>;
  gainedTokens: Partial<Record<TokenColor, number>>;
  returnedTokens?: Partial<Record<TokenColor, number>>;
  maxTokenCount?: number;
}

export interface ApplyTokenDeltaResult {
  walletAfter: TokenWallet;
  bankAfter: TokenWallet;
  gainedTokens: TokenWallet;
  returnedTokens: TokenWallet;
  totalTokensAfter: number;
}

export interface TakeTokensPolicyValue {
  takenTokens: GemWallet;
  returnedTokens: TokenWallet;
  walletAfter: TokenWallet;
  bankAfter: TokenWallet;
  totalTokensAfter: number;
}

export interface BuyPaymentEvaluationInput {
  playerTokens: PlayerTokenWallet;
  playerBonuses: PlayerBonusWallet;
  cardCost: Record<GemColor, number>;
  payment: BuyCardCommand["payload"]["payment"];
}

export interface BuyPaymentEvaluationResult {
  spentTokens: TokenWallet;
  remainingTokens: TokenWallet;
  goldSpent: number;
}

export function countPlayerTokens(tokens: PlayerTokenWallet): number {
  return TOKEN_COLORS.reduce((sum, color) => sum + tokens[color], 0);
}

export function applyTokenDeltaWithLimit(
  input: ApplyTokenDeltaInput,
): PolicyResult<ApplyTokenDeltaResult> {
  const gainedResult = normalizeTokenRecord(
    input.gainedTokens,
    TOKEN_COLORS,
    "ECONOMY_INVALID_TOKEN_QUANTITY",
  );
  if (!gainedResult.ok) {
    return gainedResult;
  }

  const returnedResult = normalizeTokenRecord(
    input.returnedTokens,
    TOKEN_COLORS,
    "ECONOMY_RETURN_TOKEN_INVALID",
  );
  if (!returnedResult.ok) {
    return returnedResult;
  }

  const gainedTokens = gainedResult.value;
  const returnedTokens = returnedResult.value;
  const walletAfter = createZeroTokenWallet();
  const bankAfter = createZeroTokenWallet();
  const maxTokenCount = input.maxTokenCount ?? PLAYER_TOKEN_LIMIT;
  const totalBeforeReturn = TOKEN_COLORS.reduce(
    (sum, color) => sum + input.playerTokens[color] + gainedTokens[color],
    0,
  );
  const totalReturnedTokens = TOKEN_COLORS.reduce(
    (sum, color) => sum + returnedTokens[color],
    0,
  );

  if (totalBeforeReturn <= maxTokenCount && totalReturnedTokens > 0) {
    return policyFailure("ECONOMY_UNNECESSARY_TOKEN_RETURN");
  }

  for (const color of TOKEN_COLORS) {
    if (input.bankTokens[color] < gainedTokens[color]) {
      return policyFailure("ECONOMY_BANK_TOKEN_UNAVAILABLE");
    }

    const availableBeforeReturn = input.playerTokens[color] + gainedTokens[color];
    if (returnedTokens[color] > availableBeforeReturn) {
      return policyFailure("ECONOMY_RETURN_TOKEN_INVALID");
    }

    walletAfter[color] =
      input.playerTokens[color] + gainedTokens[color] - returnedTokens[color];
    bankAfter[color] =
      input.bankTokens[color] - gainedTokens[color] + returnedTokens[color];
  }

  const totalTokensAfter = countPlayerTokens(walletAfter);
  if (totalTokensAfter > maxTokenCount) {
    return policyFailure("ECONOMY_TOKEN_LIMIT_EXCEEDED");
  }

  return policySuccess({
    walletAfter,
    bankAfter,
    gainedTokens,
    returnedTokens,
    totalTokensAfter,
  });
}

export function evaluateTakeTokens(
  state: GameState,
  actorId: string,
  payload: TakeTokensCommand["payload"],
): PolicyResult<TakeTokensPolicyValue> {
  const player = state.players[actorId];
  if (!player) {
    return policyFailure("ECONOMY_PLAYER_NOT_FOUND");
  }

  const requestedResult = normalizeGemRecord(payload.tokens);
  if (!requestedResult.ok) {
    return requestedResult;
  }

  const requested = requestedResult.value;
  const pickedColors = GEM_COLORS.filter((color) => requested[color] > 0);
  const totalRequested = pickedColors.reduce(
    (sum, color) => sum + requested[color],
    0,
  );

  if (!isValidTakePattern(requested, pickedColors, totalRequested)) {
    return policyFailure("ECONOMY_INVALID_TAKE_PATTERN");
  }

  if (
    pickedColors.length === 1 &&
    pickedColors[0] &&
    requested[pickedColors[0]] === 2 &&
    state.board.bankTokens[pickedColors[0]] < 4
  ) {
    return policyFailure("ECONOMY_DOUBLE_TAKE_REQUIRES_FOUR_IN_BANK");
  }

  for (const color of GEM_COLORS) {
    if (requested[color] > state.board.bankTokens[color]) {
      return policyFailure("ECONOMY_BANK_TOKEN_UNAVAILABLE");
    }
  }

  const deltaResult = applyTokenDeltaWithLimit({
    playerTokens: player.tokens,
    bankTokens: state.board.bankTokens,
    gainedTokens: requested,
    returnedTokens: payload.returnedTokens,
    maxTokenCount: PLAYER_TOKEN_LIMIT,
  });
  if (!deltaResult.ok) {
    return deltaResult;
  }

  return policySuccess({
    takenTokens: requested,
    returnedTokens: deltaResult.value.returnedTokens,
    walletAfter: deltaResult.value.walletAfter,
    bankAfter: deltaResult.value.bankAfter,
    totalTokensAfter: deltaResult.value.totalTokensAfter,
  });
}

export function evaluateBuyPayment(
  input: BuyPaymentEvaluationInput,
): PolicyResult<BuyPaymentEvaluationResult> {
  const paymentResult = normalizeTokenRecord(
    input.payment,
    TOKEN_COLORS,
    "ECONOMY_INVALID_PAYMENT",
  );
  if (!paymentResult.ok) {
    return paymentResult;
  }

  const payment = paymentResult.value;
  for (const color of TOKEN_COLORS) {
    if (payment[color] > input.playerTokens[color]) {
      return policyFailure("ECONOMY_INSUFFICIENT_FUNDS");
    }
  }

  let goldNeeded = 0;
  for (const color of GEM_COLORS) {
    const requiredByColor = Math.max(
      0,
      input.cardCost[color] - input.playerBonuses[color],
    );
    const paidByColor = payment[color];

    if (paidByColor > requiredByColor) {
      return policyFailure("ECONOMY_OVERPAYMENT_NOT_ALLOWED");
    }

    goldNeeded += requiredByColor - paidByColor;
  }

  if (payment.gold < goldNeeded) {
    return policyFailure("ECONOMY_INSUFFICIENT_FUNDS");
  }

  if (payment.gold > goldNeeded) {
    return policyFailure("ECONOMY_OVERPAYMENT_NOT_ALLOWED");
  }

  const remainingTokens = createZeroTokenWallet();
  for (const color of TOKEN_COLORS) {
    remainingTokens[color] = input.playerTokens[color] - payment[color];
  }

  return policySuccess({
    spentTokens: payment,
    remainingTokens,
    goldSpent: payment.gold,
  });
}

function isValidTakePattern(
  requested: GemWallet,
  pickedColors: readonly GemColor[],
  totalRequested: number,
): boolean {
  if (totalRequested === 0) {
    return false;
  }

  if (pickedColors.length === 3) {
    return pickedColors.every((color) => requested[color] === 1);
  }

  if (pickedColors.length === 1) {
    const color = pickedColors[0];
    return color ? requested[color] === 2 : false;
  }

  return false;
}

function normalizeGemRecord(
  input: Partial<Record<GemColor, number>>,
): PolicyResult<GemWallet> {
  return normalizeTokenRecord(
    input,
    GEM_COLORS,
    "ECONOMY_INVALID_TAKE_PATTERN",
  );
}

function normalizeTokenRecord<TColor extends string>(
  input: Partial<Record<TColor, number>> | undefined,
  colors: readonly TColor[],
  invalidCode: PolicyErrorCode,
): PolicyResult<Record<TColor, number>> {
  const result = createZeroWallet(colors);
  if (!input) {
    return policySuccess(result);
  }

  const colorSet = new Set<string>(colors);
  for (const key of Object.keys(input)) {
    if (!colorSet.has(key)) {
      return policyFailure(invalidCode);
    }
  }

  for (const color of colors) {
    const amount = input[color] ?? 0;
    if (!Number.isInteger(amount) || amount < 0) {
      return policyFailure(invalidCode);
    }
    result[color] = amount;
  }

  return policySuccess(result);
}

function createZeroWallet<TColor extends string>(
  colors: readonly TColor[],
): Record<TColor, number> {
  return colors.reduce(
    (acc, color) => {
      acc[color] = 0;
      return acc;
    },
    {} as Record<TColor, number>,
  );
}

function createZeroTokenWallet(): TokenWallet {
  return createZeroWallet(TOKEN_COLORS);
}
