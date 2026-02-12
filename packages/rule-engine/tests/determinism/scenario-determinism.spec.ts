import { ruleEngineScenarios } from "@repo/test-fixtures";
import { describe, expect, it } from "vitest";

import { runScenario } from "../helpers/scenario-runner.js";

describe("시나리오 결정론", () => {
  it.each(ruleEngineScenarios.map((scenario) => [scenario.name, scenario] as const))(
    "동일한 %s 입력은 동일한 결과를 반환한다",
    (_, scenario) => {
      const first = runScenario(scenario);
      const second = runScenario(scenario);

      expect(second.finalResult).toEqual(first.finalResult);
      expect(second.finalState).toEqual(first.finalState);
      expect(second.stepResults.map((step) => step.result)).toEqual(
        first.stepResults.map((step) => step.result),
      );
    },
  );
});

