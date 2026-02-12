export const SPLENDOR_BASE_SEED = "splendor-base-seed-v1";

export function buildSeedForTurn(turn: number): string {
  return `${SPLENDOR_BASE_SEED}:turn:${turn}`;
}
