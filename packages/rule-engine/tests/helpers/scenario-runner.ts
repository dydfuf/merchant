import type { Command, GameEvent, GameState } from "@repo/shared-types";
import type { SplendorScenario } from "@repo/test-fixtures";

import { applyCommand } from "../../src/application/apply-command.js";
import type {
  ApplyCommandResult,
  ApplyCommandSuccess,
} from "../../src/application/apply-command.js";

interface ScenarioStepResult {
  command: Command;
  stateBefore: GameState;
  result: ApplyCommandResult;
  stateAfter: GameState;
}

export interface ScenarioRunResult {
  scenario: SplendorScenario;
  stepResults: ScenarioStepResult[];
  finalResult: ApplyCommandResult;
  finalState: GameState;
}

export function runScenario(scenario: SplendorScenario): ScenarioRunResult {
  const commands = getCommandsFromScenario(scenario);
  if (commands.length === 0) {
    throw new Error(`시나리오 명령이 비어 있습니다: ${scenario.name}`);
  }

  let state = cloneState(scenario.initialState);
  const stepResults: ScenarioStepResult[] = [];

  for (const command of commands) {
    const stateBefore = cloneState(state);
    const result = applyCommand({
      state: stateBefore,
      command,
      playerOrder: scenario.playerOrder,
      deckCardIdsByTier: scenario.deckCardIdsByTier ?? {},
    });

    if (result.ok) {
      state = cloneState(result.nextState);
    }

    stepResults.push({
      command,
      stateBefore,
      result,
      stateAfter: cloneState(state),
    });

    if (!result.ok) {
      break;
    }
  }

  const finalStep = stepResults[stepResults.length - 1];
  if (!finalStep) {
    throw new Error(`시나리오 실행 결과가 비어 있습니다: ${scenario.name}`);
  }

  return {
    scenario,
    stepResults,
    finalResult: finalStep.result,
    finalState: cloneState(state),
  };
}

export function collectSuccessfulEvents(result: ScenarioRunResult): GameEvent[] {
  return result.stepResults.flatMap((step) => {
    if (!step.result.ok) {
      return [];
    }

    return step.result.events;
  });
}

export function isApplySuccess(
  result: ApplyCommandResult,
): result is ApplyCommandSuccess {
  return result.ok;
}

function getCommandsFromScenario(scenario: SplendorScenario): readonly Command[] {
  switch (scenario.kind) {
    case "single-command":
      return [scenario.command];
    case "command-sequence":
      return scenario.commands;
    default:
      return assertNever(scenario);
  }
}

function assertNever(value: never): never {
  throw new Error(`알 수 없는 시나리오 종류: ${String(value)}`);
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}
