import type { GameId } from "../common/game-id.js";
import type { IdempotencyKey } from "../common/idempotency-key.js";
import type { Version } from "../common/version.js";
import type { CommandType } from "./command.constants.js";

export interface BaseCommand<TType extends CommandType, TPayload> {
  type: TType;
  gameId: GameId;
  actorId: string;
  expectedVersion: Version;
  idempotencyKey: IdempotencyKey;
  payload: TPayload;
}
