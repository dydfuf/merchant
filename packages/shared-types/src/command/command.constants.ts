export const COMMAND_TYPE = {
  TAKE_TOKENS: "TAKE_TOKENS",
  BUY_CARD: "BUY_CARD",
  RESERVE_CARD: "RESERVE_CARD",
  END_TURN: "END_TURN",
} as const;

export type CommandType = (typeof COMMAND_TYPE)[keyof typeof COMMAND_TYPE];
