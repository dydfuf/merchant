---
module: Test Fixtures / Rule Engine / Game Server
date: 2026-02-13
problem_type: workflow_issue
component: testing_framework
symptoms:
  - "동일 시나리오에 대한 기대 결과가 fixture 밖의 각 테스트 파일에 분산되어 rule-engine과 game-server 검증 기준이 드리프트할 수 있었다"
  - "시나리오가 expectedFocus 중심 메타만 제공해 pass/fail 기준(스텝 결과, 최종 상태)이 코드에 하드코딩됐다"
  - "플레이어별 최종 상태(토큰/보너스/예약 카드 수) 회귀를 공통 시나리오 계약으로 검증하지 못했다"
root_cause: missing_workflow_step
resolution_type: workflow_improvement
severity: high
tags: [scenario-fixtures, test-contract, rule-engine, game-server, regression-prevention, splendor]
---

# Troubleshooting: Scenario Expected Outcome Contract Sync Across Layers

## Problem
`@repo/test-fixtures`의 시나리오를 `rule-engine`과 `game-server`가 함께 사용하고 있었지만, 실제 기대 결과는 각 테스트 코드 내부에서 별도로 정의됐다. 이 구조는 시나리오 데이터 소스는 하나인데 검증 기준은 여러 곳에 흩어진 상태라, 한쪽 테스트만 갱신되는 계약 드리프트를 만들기 쉬웠다.

## Environment
- Module: Test Fixtures / Rule Engine / Game Server
- Affected Component: Scenario type contract, scenario-driven tests
- Date Solved: 2026-02-13

## Symptoms
- fixture가 `expectedFocus` 설명은 제공하지만, 실제 단정값은 테스트 코드에 산재했다.
- `rule-engine` 테스트와 `game-server` 테스트가 같은 시나리오를 돌려도 기대 기준이 공통 타입으로 연결되지 않았다.
- 최종 상태의 플레이어 스냅샷(토큰 합, 보너스 합, 예약 카드 수) 회귀가 시나리오 계약 레벨에서 방어되지 않았다.

## What Didn't Work

**Attempted Solution 1:** 시나리오 실행 성공 여부(`ok`)와 버전 증가만 검증
- **Why it failed:** 테스트가 통과해도 플레이어 자원 상태 회귀를 놓칠 수 있었다.

**Attempted Solution 2:** 레이어별 테스트에서 기대값을 로컬 상수로 유지
- **Why it failed:** 동일 시나리오라도 레이어별 기대값이 분기되어 동기화 비용이 커지고 드리프트 위험이 남았다.

## Solution
시나리오 자체를 "실행 데이터 + 기대 결과"로 승격해 단일 계약으로 고정했다.

1. `scenario.types.ts`에 레이어별 `expected` 모델을 도입
- `RULE_ENGINE`: step 결과(`ok/error`), `eventTypes`, `finalState`
- `GAME_SERVER`: step 결과(`accepted/replayed/rejected`), `persistCallCount`, `finalState`
- `finalState.playerSnapshots`(player별 token/bonus/reservedCard count) 추가

2. 기존 6개 fixture에 `expected`를 명시적으로 채움
- 2인/3인/4인 rule-engine 시나리오
- idempotency/version-conflict game-server 시나리오

3. `rule-engine` 시나리오 테스트를 `expected` 기반 단정으로 변경
- 스텝별 성공/실패
- 이벤트 타입 순서
- 최종 상태 + playerSnapshots

4. `game-server` 시나리오 테스트를 동일 `expected` 기반으로 변경
- 결과 kind/reason
- final context 상태 + playerSnapshots
- persist 호출 횟수

5. `test-fixtures` 계약 테스트 강화
- 레이어 일치, 스텝 수 일치, playerSnapshots 키/값 정합성 검증

6. 병행 개선: 커맨드 서비스/룰 엔진 입력 검증 구체화
- 룰 엔진 command payload 구조 검증(`INVALID_PAYLOAD_*`)
- game-server 엔진 실패 매핑을 세부 reason으로 분리

**Code changes (요약):**
```ts
// packages/test-fixtures/src/scenarios/scenario.types.ts
export interface ScenarioExpectedFinalState {
  version: number;
  status: GameStatus;
  currentPlayerId: string;
  winnerPlayerIds?: readonly string[];
  playerSnapshots: Record<string, ScenarioExpectedPlayerSnapshot>;
}
```

```ts
// packages/rule-engine/tests/scenarios/apply-command-scenarios.spec.ts
expect(runResult.stepResults.length).toBe(scenario.expected.steps.length);
expect(events.map((event) => event.type)).toEqual(scenario.expected.eventTypes);
expect(countTokenWallet(player.tokens)).toBe(snapshot.tokenCount);
```

```ts
// apps/game-server/tests/application/game-command.service.spec.ts
expect(result.kind).toBe(expectedStep.kind);
expect(finalContext.state.version).toBe(scenario.expected.finalState.version);
expect(repository.persistCallCount).toBe(scenario.expected.persistCallCount);
```

```ts
// packages/rule-engine/src/application/validate-command.ts
return validateCommandPayloadByType(input.type, input.payload);
```

```ts
// apps/game-server/src/application/services/game-command.service.ts
case "COMMAND_ENVELOPE_INVALID":
  return reject("COMMAND_ENVELOPE_INVALID", false, undefined, result.reason);
```

**Commands run:**
```bash
pnpm lint
pnpm check-types
pnpm test
```

## Why This Works
1. 시나리오 단일 소스가 "입력 + 기대 출력"을 모두 소유해 레이어 간 계약 드리프트를 차단한다.
2. 테스트 코드가 fixture `expected`를 소비하므로, 기대값 변경은 fixture 갱신만으로 전파된다.
3. playerSnapshots를 고정해 이벤트/버전 검증만으로 놓치던 상태 회귀를 직접 탐지한다.
4. 엔진 실패 reason 세분화로 실패 원인 식별 속도와 디버깅 정확도가 올라간다.

## Prevention
- 시나리오 추가 시 `expected.steps`, `expected.finalState`, `playerSnapshots`를 반드시 함께 작성한다.
- 레이어 테스트에서 로컬 기대 상수를 만들지 않고 fixture `expected`만 참조한다.
- `test-fixtures` 계약 테스트에서 playerSnapshots 키가 `initialState.players`와 일치하는지 계속 검증한다.
- 커맨드 입력 shape 변경 시 `validate-command`와 거절 사유 매핑 테스트를 동시에 갱신한다.

## Related Issues
- Related docs:
  - `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md`
  - `docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md`
- Related plans:
  - `docs/plans/2026-02-12-feat-rule-engine-test-fixture-expansion-plan.md`
  - `docs/plans/2026-02-12-feat-game-server-orchestration-connection-plan.md`
- Related GitHub issues: none linked in repository metadata
