import type {
  Command,
  DeckTier,
  EventType,
  GameStatus,
  GameState,
} from "@repo/shared-types";

export type ScenarioLayer = "RULE_ENGINE" | "GAME_SERVER";

export const MAX_SCENARIO_COMMAND_COUNT = 32;
export const MAX_SCENARIO_DECK_CONTEXT_PER_TIER = 90;

export interface ScenarioExpectedFinalState {
  version: number;
  status: GameStatus;
  currentPlayerId: string;
  winnerPlayerIds?: readonly string[];
  playerSnapshots: Record<string, ScenarioExpectedPlayerSnapshot>;
}

export interface ScenarioExpectedPlayerSnapshot {
  tokenCount: number;
  bonusCount: number;
  reservedCardCount: number;
}

export interface RuleEngineStepExpectation {
  result: "ok" | "error";
  code?: string;
  policyCode?: string;
}

export interface RuleEngineExpectedOutcome {
  layer: "RULE_ENGINE";
  steps: readonly RuleEngineStepExpectation[];
  eventTypes: readonly EventType[];
  finalState: ScenarioExpectedFinalState;
}

export interface GameServerStepExpectation {
  kind: "accepted" | "replayed" | "rejected";
  reason?: string;
}

export interface GameServerExpectedOutcome {
  layer: "GAME_SERVER";
  steps: readonly GameServerStepExpectation[];
  finalState: ScenarioExpectedFinalState;
  persistCallCount: number;
}

export type ScenarioExpectedOutcome =
  | RuleEngineExpectedOutcome
  | GameServerExpectedOutcome;

interface BaseScenario<TLayer extends ScenarioLayer> {
  name: string;
  layer: TLayer;
  expectedFocus: string;
  initialState: GameState;
  playerOrder: readonly string[];
  deckCardIdsByTier?: Partial<Record<DeckTier, readonly string[]>>;
  expected: Extract<ScenarioExpectedOutcome, { layer: TLayer }>;
}

export interface SingleCommandScenario<TLayer extends ScenarioLayer = ScenarioLayer>
  extends BaseScenario<TLayer> {
  kind: "single-command";
  command: Command;
}

export interface CommandSequenceScenario<TLayer extends ScenarioLayer = ScenarioLayer>
  extends BaseScenario<TLayer> {
  kind: "command-sequence";
  commands: readonly Command[];
}

export type SplendorScenario = SingleCommandScenario | CommandSequenceScenario;
