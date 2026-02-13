import type { Command, DeckTier } from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import {
  allSplendorScenarios,
  gameServerScenarios,
  MAX_SCENARIO_COMMAND_COUNT,
  MAX_SCENARIO_DECK_CONTEXT_PER_TIER,
  ruleEngineScenarios,
  type SplendorScenario,
} from "../src/index.js";

describe("시나리오 계약", () => {
  it("모든 시나리오 이름은 고유하다", () => {
    const names = allSplendorScenarios.map((scenario) => scenario.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("모든 시나리오는 플레이어 순서와 명령 주체가 유효하다", () => {
    for (const scenario of allSplendorScenarios) {
      const playerIds = Object.keys(scenario.initialState.players);

      expect(scenario.playerOrder.length).toBe(playerIds.length);
      expect(new Set(scenario.playerOrder).size).toBe(
        scenario.playerOrder.length,
      );

      for (const playerId of scenario.playerOrder) {
        expect(playerIds).toContain(playerId);
      }

      for (const command of getScenarioCommands(scenario)) {
        expect(playerIds).toContain(command.actorId);
        expect(command.gameId).toBe(scenario.initialState.gameId);
        expect(Number.isInteger(command.expectedVersion)).toBe(true);
        expect(command.expectedVersion).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("명령 시퀀스는 비어 있지 않고 최대 길이를 넘지 않는다", () => {
    for (const scenario of allSplendorScenarios) {
      if (scenario.kind !== "command-sequence") {
        continue;
      }

      expect(scenario.commands.length).toBeGreaterThan(0);
      expect(scenario.commands.length).toBeLessThanOrEqual(
        MAX_SCENARIO_COMMAND_COUNT,
      );
    }
  });

  it("덱 컨텍스트가 있으면 티어별 최대 크기와 중복 규칙을 지킨다", () => {
    const deckTiers: readonly DeckTier[] = [1, 2, 3];

    for (const scenario of allSplendorScenarios) {
      const deckContext = scenario.deckCardIdsByTier;
      if (!deckContext) {
        continue;
      }

      for (const tier of deckTiers) {
        const cards = deckContext[tier];
        if (!cards) {
          continue;
        }

        expect(cards.length).toBeLessThanOrEqual(
          MAX_SCENARIO_DECK_CONTEXT_PER_TIER,
        );
        expect(new Set(cards).size).toBe(cards.length);
      }
    }
  });

  it("RULE_ENGINE 시나리오는 2인/3인/4인 세팅을 모두 포함한다", () => {
    const coveredPlayerCounts = new Set(
      ruleEngineScenarios.map(
        (scenario) => Object.keys(scenario.initialState.players).length,
      ),
    );

    expect(coveredPlayerCounts.has(2)).toBe(true);
    expect(coveredPlayerCounts.has(3)).toBe(true);
    expect(coveredPlayerCounts.has(4)).toBe(true);
  });

  it("시나리오 기대 결과는 레이어/명령 수와 정합성을 가진다", () => {
    for (const scenario of allSplendorScenarios) {
      expect(scenario.expected.layer).toBe(scenario.layer);

      const commandCount = getScenarioCommands(scenario).length;
      expect(scenario.expected.steps.length).toBe(commandCount);
      expect(scenario.expected.finalState.version).toBeGreaterThanOrEqual(
        scenario.initialState.version,
      );
      expect(scenario.expected.finalState.currentPlayerId.length).toBeGreaterThan(0);

      const scenarioPlayerIds = Object.keys(scenario.initialState.players).sort();
      const snapshotPlayerIds = Object.keys(
        scenario.expected.finalState.playerSnapshots,
      ).sort();
      expect(snapshotPlayerIds).toEqual(scenarioPlayerIds);

      for (const playerId of snapshotPlayerIds) {
        const snapshot = scenario.expected.finalState.playerSnapshots[playerId];
        if (!snapshot) {
          throw new Error(`player snapshot is missing: ${scenario.name}:${playerId}`);
        }

        expect(Number.isInteger(snapshot.tokenCount)).toBe(true);
        expect(Number.isInteger(snapshot.bonusCount)).toBe(true);
        expect(Number.isInteger(snapshot.reservedCardCount)).toBe(true);
        expect(snapshot.tokenCount).toBeGreaterThanOrEqual(0);
        expect(snapshot.bonusCount).toBeGreaterThanOrEqual(0);
        expect(snapshot.reservedCardCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("RULE_ENGINE 기대 결과는 이벤트 타입 목록을 가진다", () => {
    for (const scenario of ruleEngineScenarios) {
      if (scenario.expected.layer !== "RULE_ENGINE") {
        throw new Error(`RULE_ENGINE expected layer mismatch: ${scenario.name}`);
      }

      for (const eventType of scenario.expected.eventTypes) {
        expect(typeof eventType).toBe("string");
        expect(eventType.length).toBeGreaterThan(0);
      }
    }
  });

  it("GAME_SERVER 기대 결과는 persist 호출 횟수를 정의한다", () => {
    for (const scenario of gameServerScenarios) {
      if (scenario.expected.layer !== "GAME_SERVER") {
        throw new Error(`GAME_SERVER expected layer mismatch: ${scenario.name}`);
      }

      expect(Number.isInteger(scenario.expected.persistCallCount)).toBe(true);
      expect(scenario.expected.persistCallCount).toBeGreaterThanOrEqual(0);
    }
  });
});

function getScenarioCommands(scenario: SplendorScenario): readonly Command[] {
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
