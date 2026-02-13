import { gameServerScenarios, ruleEngineScenarios } from "@repo/test-fixtures";
import { describe, expect, it } from "vitest";

import { collectSuccessfulEvents, runScenario } from "../helpers/scenario-runner.js";

describe("시나리오 기반 명령 적용", () => {
  it.each(ruleEngineScenarios.map((scenario) => [scenario.name, scenario] as const))(
    "%s 시나리오를 성공적으로 적용한다",
    (_, scenario) => {
      if (scenario.expected.layer !== "RULE_ENGINE") {
        throw new Error(`RULE_ENGINE expected layer mismatch: ${scenario.name}`);
      }

      const runResult = runScenario(scenario);

      expect(runResult.stepResults.length).toBe(scenario.expected.steps.length);

      for (const [index, stepResult] of runResult.stepResults.entries()) {
        const expectedStep = scenario.expected.steps[index];
        if (!expectedStep) {
          throw new Error(`expected step is missing: ${scenario.name}:${index}`);
        }

        if (expectedStep.result === "ok") {
          expect(stepResult.result.ok).toBe(true);
        } else {
          expect(stepResult.result.ok).toBe(false);
          if (!stepResult.result.ok) {
            expect(stepResult.result.code).toBe(expectedStep.code);
            expect(stepResult.result.policyCode).toBe(expectedStep.policyCode);
          }
        }
      }

      const events = collectSuccessfulEvents(runResult);
      expect(events.map((event) => event.type)).toEqual(scenario.expected.eventTypes);

      const lastEvent = events[events.length - 1];
      if (lastEvent) {
        expect(runResult.finalState.version).toBe(lastEvent.version);
      }
      expect(runResult.finalState.version).toBe(scenario.expected.finalState.version);
      expect(runResult.finalState.status).toBe(scenario.expected.finalState.status);
      expect(runResult.finalState.currentPlayerId).toBe(
        scenario.expected.finalState.currentPlayerId,
      );
      expect(runResult.finalState.winnerPlayerIds).toEqual(
        scenario.expected.finalState.winnerPlayerIds,
      );
      for (const [playerId, snapshot] of Object.entries(
        scenario.expected.finalState.playerSnapshots,
      )) {
        const player = runResult.finalState.players[playerId];
        if (!player) {
          throw new Error(`player is missing in final state: ${scenario.name}:${playerId}`);
        }

        expect(countTokenWallet(player.tokens)).toBe(snapshot.tokenCount);
        expect(countGemWallet(player.bonuses)).toBe(snapshot.bonusCount);
        expect(player.reservedCardIds.length).toBe(snapshot.reservedCardCount);
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
      expect(scenario.expected.layer).toBe("GAME_SERVER");
      expect(scenario.expectedFocus.length).toBeGreaterThan(0);
    },
  );
});

function countTokenWallet(wallet: Record<string, number>): number {
  return Object.values(wallet).reduce((sum, value) => sum + value, 0);
}

function countGemWallet(wallet: Record<string, number>): number {
  return Object.values(wallet).reduce((sum, value) => sum + value, 0);
}
