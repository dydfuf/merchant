import type { BuyCardCommand } from "./buy-card.command.js";
import type { EndTurnCommand } from "./end-turn.command.js";
import type { ReserveCardCommand } from "./reserve-card.command.js";
import type { TakeTokensCommand } from "./take-tokens.command.js";

export type Command =
  | TakeTokensCommand
  | BuyCardCommand
  | ReserveCardCommand
  | EndTurnCommand;

export type CommandType = Command["type"];
