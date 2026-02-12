import { gameServerScenarios, ruleEngineScenarios } from "@repo/test-fixtures";
import { describe, expect, it } from "vitest";

import { collectSuccessfulEvents, runScenario } from "../helpers/scenario-runner.js";

describe("시나리오 기반 명령 적용", () => {
  it.each(ruleEngineScenarios.map((scenario) => [scenario.name, scenario] as const))(
    "%s 시나리오를 성공적으로 적용한다",
    (_, scenario) => {
      const runResult = runScenario(scenario);

      expect(runResult.finalResult.ok).toBe(true);
      for (const stepResult of runResult.stepResults) {
        expect(stepResult.result.ok).toBe(true);
      }

      const events = collectSuccessfulEvents(runResult);
      expect(events.length).toBeGreaterThan(0);

      let expectedVersion = scenario.initialState.version + 1;
      for (const event of events) {
        expect(event.version).toBe(expectedVersion);
        expectedVersion += 1;
      }

      const lastEvent = events[events.length - 1];
      if (lastEvent) {
        expect(runResult.finalState.version).toBe(lastEvent.version);
      }
      expect(
        Object.hasOwn(runResult.finalState.players, runResult.finalState.currentPlayerId),
      ).toBe(true);
    },
  );

  it.each(gameServerScenarios.map((scenario) => [scenario.name, scenario] as const))(
    "%s 시나리오는 GAME_SERVER 범위로 분리되어 있다",
    (_, scenario) => {
      expect(scenario.layer).toBe("GAME_SERVER");
      expect(scenario.expectedFocus.length).toBeGreaterThan(0);
    },
  );
});

