import type { BaseCommand } from "./base-command.js";
import { COMMAND_TYPE } from "./command.constants.js";
import type { TokenColor } from "../state/player.state.js";

export type BuyCardSource =
  | {
      kind: "OPEN_MARKET";
      cardId: string;
    }
  | {
      kind: "RESERVED";
      cardId: string;
    };

export type BuyCardPayload = {
  source: BuyCardSource;
  payment: Partial<Record<TokenColor, number>>;
};

export type BuyCardCommand = BaseCommand<
  (typeof COMMAND_TYPE)["BUY_CARD"],
  BuyCardPayload
>;
