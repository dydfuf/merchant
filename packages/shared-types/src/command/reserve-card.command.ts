import type { BaseCommand } from "./base-command.js";
import { COMMAND_TYPE } from "./command.constants.js";
import type { DeckTier } from "../state/board.state.js";
import type { TokenColor } from "../state/player.state.js";

export type ReserveCardTarget =
  | {
      kind: "OPEN_CARD";
      cardId: string;
      tier: DeckTier;
    }
  | {
      kind: "DECK_TOP";
      tier: DeckTier;
    };

export type ReserveCardPayload = {
  target: ReserveCardTarget;
  returnedTokens?: Partial<Record<TokenColor, number>>;
  takeGoldToken: boolean;
};

export type ReserveCardCommand = BaseCommand<
  (typeof COMMAND_TYPE)["RESERVE_CARD"],
  ReserveCardPayload
>;
