import type { CardBoughtEvent } from "./card-bought.event.js";
import type { CardReservedEvent } from "./card-reserved.event.js";
import type { GameEndedEvent } from "./game-ended.event.js";
import type { TokensTakenEvent } from "./tokens-taken.event.js";
import type { TurnEndedEvent } from "./turn-ended.event.js";

export type GameEvent =
  | TokensTakenEvent
  | CardBoughtEvent
  | CardReservedEvent
  | TurnEndedEvent
  | GameEndedEvent;

export type EventType = GameEvent["type"];
