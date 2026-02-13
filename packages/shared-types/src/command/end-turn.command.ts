import type { BaseCommand } from "./base-command.js";
import { COMMAND_TYPE } from "./command.constants.js";

export type EndTurnReason = "ACTION_COMPLETED" | "MANUAL" | "RECOVERY";

export type EndTurnPayload = {
  reason: EndTurnReason;
};

export type EndTurnCommand = BaseCommand<
  (typeof COMMAND_TYPE)["END_TURN"],
  EndTurnPayload
>;
