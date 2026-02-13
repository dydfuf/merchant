import type { BaseCommand } from "./base-command.js";
import { COMMAND_TYPE } from "./command.constants.js";
import type { GemColor, TokenColor } from "../state/player.state.js";

export type TakeTokensPayload = {
  tokens: Partial<Record<GemColor, number>>;
  returnedTokens?: Partial<Record<TokenColor, number>>;
};

export type TakeTokensCommand = BaseCommand<
  (typeof COMMAND_TYPE)["TAKE_TOKENS"],
  TakeTokensPayload
>;
