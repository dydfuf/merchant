import type { Command } from "@repo/shared-types";

import type {
  GameCommandServiceResult,
} from "../../application/services/game-command.service.js";

export interface WsAuthContext {
  userId: string;
  sessionId?: string;
}

export interface HandleGameCommandInput {
  auth: WsAuthContext;
  command: Command;
}

export type GameGatewayResponse =
  | {
      ok: true;
      result: GameCommandServiceResult;
    }
  | {
      ok: false;
      reason: "UNAUTHORIZED_ACTOR";
      message: string;
    };
