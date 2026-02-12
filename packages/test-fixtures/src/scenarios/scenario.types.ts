import type { Command, DeckTier, GameState } from "@repo/shared-types";

export type ScenarioLayer = "RULE_ENGINE" | "GAME_SERVER";

export const MAX_SCENARIO_COMMAND_COUNT = 32;
export const MAX_SCENARIO_DECK_CONTEXT_PER_TIER = 90;

interface BaseScenario {
  name: string;
  layer: ScenarioLayer;
  expectedFocus: string;
  initialState: GameState;
  playerOrder: readonly string[];
  deckCardIdsByTier?: Partial<Record<DeckTier, readonly string[]>>;
}

export interface SingleCommandScenario extends BaseScenario {
  kind: "single-command";
  command: Command;
}

export interface CommandSequenceScenario extends BaseScenario {
  kind: "command-sequence";
  commands: readonly Command[];
}

export type SplendorScenario = SingleCommandScenario | CommandSequenceScenario;

