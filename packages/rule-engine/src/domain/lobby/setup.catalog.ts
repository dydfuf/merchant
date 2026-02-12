export type SupportedPlayerCount = 2 | 3 | 4;

export interface PlayerSetupConfig {
  gemTokensPerColor: number;
  goldTokens: number;
  revealedNobles: number;
}

export const PLAYER_SETUP_BY_COUNT: Readonly<
  Record<SupportedPlayerCount, PlayerSetupConfig>
> = {
  2: {
    gemTokensPerColor: 4,
    goldTokens: 5,
    revealedNobles: 3,
  },
  3: {
    gemTokensPerColor: 5,
    goldTokens: 5,
    revealedNobles: 4,
  },
  4: {
    gemTokensPerColor: 7,
    goldTokens: 5,
    revealedNobles: 5,
  },
};
