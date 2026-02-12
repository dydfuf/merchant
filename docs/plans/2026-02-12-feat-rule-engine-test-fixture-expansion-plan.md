---
title: "feat: 룰엔진 테스트/픽스처 확장 (DD-0002 Step 5)"
type: feat
date: 2026-02-12
---

# ✨ feat: 룰엔진 테스트/픽스처 확장 (DD-0002 Step 5)

## Enhancement Summary

**Deepened on:** 2026-02-12  
**Sections enhanced:** 8  
**Skill sources used:** `architecture-strategist`, `performance-oracle`, `security-sentinel`, `kieran-typescript-reviewer`, `pattern-recognition-specialist`, `code-simplicity-reviewer`, `framework-docs-researcher`, `best-practices-researcher`  
**Agent discovery result:** `.claude/agents`, `~/.claude/agents`, plugin cache 내 실행 가능한 agent definition 없음

### Key Improvements

1. Step 5 범위를 유지하면서도 `test-fixtures`의 실행 검증 게이트를 명시해 \"정의 전용 fixture\" 리스크를 줄였다.
2. Vitest 공식 패턴(`test.extend`, workspace/projects, include 분리)과 TypeScript `satisfies`/`assertNever`를 fixture 계약에 연결했다.
3. 성능/보안/아키텍처 관점의 교차 검토 항목(결정론 유지, DoS성 대형 시나리오 방지, 경계 분리)을 수용해 실행 우선순위를 재정렬했다.

### New Considerations Discovered

- `@repo/test-fixtures` 소비 테스트가 현재 0건이므로, Step 5 완료 기준에 \"fixture package 자체 contract test\"를 명시해야 한다.
- `passWithNoTests` 상태에서는 fixture 품질이 패키지 단위로 보호되지 않는다.
- fixture object shape는 `satisfies`로 정확 키 검증을 강제하는 편이 계약 드리프트에 강하다.

## Section Manifest

Section 1: Overview - Step 5 성공 기준의 실행형 정의(문서->검증)  
Section 2: Research Decision - 외부/내부 근거 출처와 적용 범위 명확화  
Section 3: Research Findings - 스킬/공식 문서/학습 문서 통합 근거 추가  
Section 4: Proposed Solution - Vitest/TypeScript 기반 구현 디테일 보강  
Section 5: Implementation Phases - 단계별 품질 게이트와 롤아웃 순서 구체화  
Section 6: Acceptance Criteria - 측정 가능한 완료 조건 정밀화  
Section 7: Dependencies & Risks - 성능/보안/경계 리스크 보강  
Section 8: Validation & References - 패키지 단위 검증 명령과 외부 레퍼런스 추가

## Overview

`DD-0002` Step 5를 독립 실행 가능한 계획으로 고정한다. 목표는 `rule-engine` 테스트와 `test-fixtures`를 실제 회귀 방어 체계로 연결해, 정책/결정론/시나리오(2인/3인/4인) 검증을 일관된 데이터 소스로 운영하는 것이다.

핵심은 다음 3가지다.

- 정책 실패 코드를 명시적으로 검증하는 음수 테스트를 유지한다.
- 동일 입력/seed에서 동일 결과를 보장하는 결정론 검증을 시나리오 단위까지 확장한다.
- `test-fixtures`를 "정의만 존재" 상태에서 "소비되는 표준 시나리오 패키지"로 전환한다.

## Idea Refinement Notes

- 브레인스토밍 확인 결과: `docs/brainstorms/2026-02-12-solo-bot-hybrid-brainstorm.md` 1건만 존재하며, 본 요청(DD-0002 Step 5)과 주제가 달라 미적용.
- 사용자 요청이 `DD-0002`의 "5. 룰엔진 테스트/픽스처 확장"을 명시하므로 추가 정제 질의 없이 계획 단계로 진행.

## Research Decision

외부 리서치는 \"공식 문서 기반 보강\" 수준으로 제한 적용한다.

- 내부 근거(기존 테스트/fixture/solutions)만으로도 계획 수립은 가능하지만, 테스트 구조 개선은 도구별 권장 패턴 반영 시 재작업이 줄어든다.
- 외부 근거는 Vitest/TypeScript의 공식 문서만 사용하고, 커뮤니티 블로그/비공식 튜토리얼은 본 계획의 1차 근거로 채택하지 않는다.
- 이번 계획은 새로운 기능 개발이 아니라 기존 Step 5 구현 품질 강화이므로, 공식 문서에서 즉시 적용 가능한 패턴만 추려 반영한다.

## Research Findings (Local)

### 1) Step 5 정의는 명확함

- Step 5 대상/내용: `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:141`
  - 대상: `packages/rule-engine/tests/rules/**`, `packages/rule-engine/tests/determinism/**`, `packages/test-fixtures/src/**`
  - 내용: 정책 단위 테스트, 동일 입력/seed 결정론 테스트, 2/3/4인 시나리오 픽스처

### 2) rule-engine 테스트는 이미 넓게 존재함

- 상태전이 테스트: `packages/rule-engine/tests/application/apply-command.spec.ts:20`
- 결정론 테스트: `packages/rule-engine/tests/determinism/apply-command.determinism.spec.ts:12`
- 정책 테스트: `packages/rule-engine/tests/rules/economy.policy.spec.ts:14`, `packages/rule-engine/tests/rules/scoring.policy.spec.ts:13`

### 3) test-fixtures는 시나리오를 export하지만 실제 소비 연결이 약함

- 시나리오 export: `packages/test-fixtures/src/index.ts:5`
- 3인/4인 핵심 fixture 존재:
  - `packages/test-fixtures/src/scenarios/three-player/noble-double-eligibility.fixture.ts:8`
  - `packages/test-fixtures/src/scenarios/four-player/token-limit-return.fixture.ts:8`
- 그러나 테스트 코드에서 `@repo/test-fixtures` import 사용 흔적이 없음 (repo 검색 결과 0건).

### 4) 테스트 데이터 빌더가 이중화되어 드리프트 위험 존재

- rule-engine 테스트 전용 factory: `packages/rule-engine/tests/helpers/state.factory.ts:20`
- test-fixtures 공용 builder: `packages/test-fixtures/src/builders/game-state.builder.ts:20`
- 동일 성격 함수가 별도로 유지되어 기준 상태/플레이어 ID/seed 규약이 분기될 수 있음.

### 5) test-fixtures 패키지 자체 검증 게이트가 약함

- `passWithNoTests: true`: `packages/test-fixtures/vitest.config.ts:10`
- 즉, fixture 형상/시나리오 일관성 회귀가 발생해도 package 단독 테스트로는 탐지되지 않을 수 있음.

### 6) 스킬 기반 추가 검토 결과

- `architecture-strategist` 관점: Step 5는 `rule-engine` 순수 경계 검증에 집중하고, idempotency/version-conflict는 Step 6로 분리 유지가 타당하다.
- `pattern-recognition-specialist` 관점: `state.factory`와 `game-state.builder` 이원화는 유지 시 규약 드리프트 가능성이 높아 canonical source를 명시해야 한다.
- `kieran-typescript-reviewer` 관점: fixture 계약 타입은 string literal + discriminated union + `assertNever` 기반으로 누락 케이스를 컴파일 단계에서 차단해야 한다.
- `code-simplicity-reviewer` 관점: 범용 시나리오 엔진을 과도하게 추상화하지 말고 Step 5 범위에서 필요한 최소 helper만 도입한다.
- `performance-oracle` 관점: fixture 루프 실행은 테스트 수가 커지면 O(n*m) 비용이 증가하므로, tiered suite(`smoke`/`full`) 설계를 초기부터 포함해야 한다.
- `security-sentinel` 관점: 테스트 입력이라도 비정상적으로 큰 deck/context를 허용하면 CI 자원 고갈형 케이스가 생길 수 있어 입력 크기 upper bound 검증이 필요하다.

### 7) 공식 문서 기반 추가 근거

- Vitest는 `test.extend`로 재사용 fixture를 타입 안전하게 공유할 수 있고, 실제 사용하는 테스트에서만 fixture를 초기화하는 방식이 가능하다.
- Vitest projects/workspace 구성을 통해 패키지별 include 경로와 환경을 분리해 monorepo에서 테스트 책임을 명확히 유지할 수 있다.
- TypeScript `satisfies`는 fixture literal의 정확 키/값 제약을 검증하면서도 property-level inference를 유지한다.
- TypeScript `assertNever`는 scenario kind switch 누락을 compile-time에 감지하는 데 적합하다.

## Institutional Learnings Applied

### A. 입력 검증 누락은 정책 회귀로 재발함

- 근거: `docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md:42`
- 적용: Step 5에 "정책 실패코드 음수 테스트 유지/확장"을 명시해 `ECONOMY_UNNECESSARY_TOKEN_RETURN`, `SCORING_FINAL_SCORES_INVALID` 같은 실패 경로가 시나리오 기반 테스트에서도 검증되도록 한다.

### B. 양수 케이스만으로는 계약 드리프트를 막지 못함

- 근거: `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md:48`
- 적용: fixture/command builder에도 금지 조합 회귀를 막는 타입/런타임 음수 검증을 포함한다.

## SpecFlow Analysis

### User Flow Overview

1. 정책 단위 흐름
- 입력 상태/command payload를 정책 함수에 전달한다.
- 성공 시 계산 결과를, 실패 시 정책 오류 코드를 단정(assert)한다.

2. 상태전이-시나리오 흐름
- fixture(`initialState`, `command` 또는 `commands`)를 로드한다.
- `applyCommand`를 순차 적용한다.
- 각 단계에서 이벤트/스냅샷 버전/보드/플레이어 상태 불변식을 검증한다.

3. 결정론 흐름
- 동일 fixture 입력(state, seed, deck context, command sequence)을 2회 실행한다.
- 반환된 `events`, `nextState`, 실패 코드가 완전 동일함을 검증한다.

### Flow Permutations Matrix

| 축 | 케이스 | 검증 포인트 |
| --- | --- | --- |
| 플레이어 수 | 2인 | 기본 흐름, final round 동률 처리 |
| 플레이어 수 | 3인 | 복수 귀족 자격 deterministic 선택 |
| 플레이어 수 | 4인 | 10개 초과 반납 규칙 |
| 결과 유형 | 성공 | 이벤트 버전 증가, 상태 반영 일치 |
| 결과 유형 | 실패 | 정책 실패코드/이유 일치 |
| 결정론 | 동일 입력 재실행 | 결과 객체 완전 동일 |

### Missing Elements & Gaps

- `test-fixtures` 시나리오가 `rule-engine` 테스트에서 공통 데이터 소스로 사용되지 않아 Step 5 목표(시나리오 픽스처 기반 회귀)가 약하다.
- `test-fixtures` 패키지 내부 검증이 비어 있어 fixture 변경 자체의 회귀 탐지가 어렵다.
- `rule-engine/tests/helpers/state.factory.ts`와 `packages/test-fixtures/src/builders/game-state.builder.ts`가 병행 유지되어 상태 기본값 드리프트 위험이 있다.
- 2/3/4인 fixture가 "존재"는 하지만 "적용 결과 검증"(scenario runner)으로 연결된 테스트셋이 명시적으로 고정되어 있지 않다.

### Critical Questions Requiring Clarification

1. Critical
- 질문: Step 5에서 `idempotency`/`version-conflict` 시나리오를 유지할지, Step 6(server application)로 완전히 분리할지?
- 이유: 이 두 시나리오는 서버 오케스트레이션 성격이 강해 Step 5 경계와 충돌할 수 있다.
- 미응답 시 기본 가정: fixture는 유지하되, Step 5 테스트 본체에서는 "rule-engine 순수 경계"만 단정한다.

2. Important
- 질문: 테스트 플레이어 ID 표준을 `p1/p2`와 `player-1/player-2` 중 무엇으로 통일할지?
- 이유: 빌더 이원화가 계속되면 fixture 재사용 비용이 누적된다.
- 미응답 시 기본 가정: `packages/test-fixtures` 형식을 canonical로 두고 rule-engine helper를 점진 폐기한다.

3. Important
- 질문: `test-fixtures` 패키지에서 `passWithNoTests`를 제거할지?
- 이유: Step 5 완료 정의를 "fixture 품질 게이트 존재"로 둘지의 문제다.
- 미응답 시 기본 가정: 최소 1개 contract/spec 테스트 추가 후 `passWithNoTests` 제거를 목표로 한다.

## Proposed Solution

### A. 시나리오 계약(Contract) 명시화

대상 파일(예정):
- `packages/test-fixtures/src/scenarios/scenario.types.ts` (신규)
- `packages/test-fixtures/src/index.ts`

핵심:
- `SingleCommandScenario`, `CommandSequenceScenario` 타입을 분리한다.
- 모든 fixture에 `name`, `initialState`, `expectedFocus`(검증 의도 메타)를 부여한다.
- 타입만으로는 부족한 제약(예: 빈 command sequence 금지)은 fixture 검증 테스트에서 보완한다.

### B. rule-engine scenario runner 도입

대상 파일(예정):
- `packages/rule-engine/tests/scenarios/apply-command-scenarios.spec.ts` (신규)

핵심:
- `@repo/test-fixtures`에서 2인/3인/4인 fixture를 import해 공통 실행기(`runScenario`)로 처리한다.
- 성공 시 이벤트 버전 연속성, 상태 버전 동기화, 핵심 도메인 필드 변화를 검증한다.
- 실패 시 `code`, `policyCode`를 명시 단정한다.

예시 스케치:

```ts
// packages/rule-engine/tests/scenarios/apply-command-scenarios.spec.ts (planned)
import { tokenLimitReturnFixture } from "@repo/test-fixtures";

it("4인 토큰 반납 시나리오를 재현한다", () => {
  const result = runScenario(tokenLimitReturnFixture);
  expect(result.ok).toBe(true);
  expect(result.lastEventVersion).toBe(result.nextState.version);
});
```

### C. 결정론 검증을 시나리오 단위로 확장

대상 파일(예정):
- `packages/rule-engine/tests/determinism/scenario-determinism.spec.ts` (신규)

핵심:
- 동일 fixture를 2회 실행해 `events`/`state` deep-equal을 보장한다.
- 덱 보충이 포함된 예약/구매 시나리오를 우선 포함한다.

### D. fixture 품질 게이트 추가

대상 파일(예정):
- `packages/test-fixtures/src/scenarios/scenario-contract.spec.ts` (신규)
- `packages/test-fixtures/vitest.config.ts`

핵심:
- fixture 명명 중복, 비어 있는 command sequence, actor 미존재 같은 구조 오류를 검증한다.
- 최소 테스트가 준비되면 `passWithNoTests` 제거를 목표로 한다.

### E. 학습 문서 기반 회귀 케이스 유지

대상 파일(예정):
- `packages/rule-engine/tests/rules/economy.policy.spec.ts`
- `packages/rule-engine/tests/rules/scoring.policy.spec.ts`
- `packages/rule-engine/tests/scenarios/apply-command-scenarios.spec.ts` (신규)

핵심:
- "불필요 반납 금지"와 "최종 점수맵 정합성" 실패 케이스를 scenario 레벨에서도 재단정한다.

### F. Vitest/TypeScript 권장 패턴 구체 반영

대상 파일(예정):
- `packages/rule-engine/tests/scenarios/apply-command-scenarios.spec.ts` (신규)
- `packages/rule-engine/tests/helpers/scenario-runner.ts` (신규)
- `packages/test-fixtures/src/scenarios/scenario.types.ts` (신규)

핵심:
- 시나리오 반복 검증은 `test.each` 스타일로 통합해 케이스 추가 시 테스트 코드 중복을 줄인다.
- fixture loader는 Vitest `test.extend` 기반으로 옮길 수 있도록 설계해 초기화/정리 책임을 명확히 둔다.
- scenario definition object는 `satisfies`를 사용해 키/shape를 고정한다.
- scenario kind 분기(`single-command`/`command-sequence`)는 `assertNever`로 누락을 차단한다.

예시 스케치:

```ts
// packages/test-fixtures/src/scenarios/two-player/basic-flow.fixture.ts (planned shape)
export const basicTwoPlayerFlowFixture = {
  kind: "command-sequence",
  name: "two-player-basic-flow",
  // ...
} satisfies CommandSequenceScenario;
```

```ts
// packages/rule-engine/tests/helpers/scenario-runner.ts (planned)
function assertNever(x: never): never {
  throw new Error(`unreachable scenario kind: ${String(x)}`);
}
```

## Implementation Phases

### Phase 1: Fixture Contract Baseline

- scenario 타입 정의 및 index export 구조 정리
- fixture naming/id 규칙 확정
- fixture package 최소 검증 테스트 1차 도입
- `satisfies` 기반 fixture literal 검증 룰 도입
- `scenario-contract.spec.ts`에서 size upper bound(예: command sequence 길이, deck context 길이) 검증 추가

### Phase 2: Scenario Runner Integration

- `rule-engine`에 scenario-runner 테스트 추가
- 2인/3인/4인 fixture 연결
- 성공/실패 단정 템플릿 확정
- `test.each` 기반으로 성공/실패 케이스를 표 형식 데이터로 관리
- runner에서 이벤트 version 연속성/`nextState.version` 동기화 invariant를 공통 검증

### Phase 3: Determinism Expansion

- scenario 재실행 동일성 테스트 추가
- 덱 보충/귀족 방문/final round 케이스 포함
- 동일 입력 2회 비교 + 시드 변형 1회 비교(결과 달라져야 하는 케이스)로 deterministic/seed-sensitivity를 분리 검증

### Phase 4: Drift Control

- rule-engine 전용 state helper와 test-fixtures builder 역할 경계 재정의
- 중복 빌더의 점진 축소 또는 adapter 도입
- 문서/테스트 체크리스트 동기화
- `passWithNoTests` 제거 전환 기준(최소 fixture 계약 테스트 수/실행 시간 목표) 명시
- Step 6 경계 항목(idempotency, version conflict) 테스트는 game-server 레이어로 명시 이관

## Acceptance Criteria

- [x] Step 5 대상 경로(`rule-engine/tests/rules`, `rule-engine/tests/determinism`, `test-fixtures/src`) 각각에 확장 변경이 포함된다.
- [x] 2인/3인/4인 fixture를 실제 실행하는 scenario 테스트가 `rule-engine`에 추가된다.
- [x] 동일 fixture 재실행 시 결과 동일성을 검증하는 결정론 테스트가 추가된다.
- [x] `ECONOMY_UNNECESSARY_TOKEN_RETURN`, `SCORING_FINAL_SCORES_INVALID` 회귀가 정책/시나리오 레벨에서 모두 검증된다.
- [x] 테스트 케이스명(`describe`, `it`, `test`)은 한글 기준을 유지한다.
- [x] `pnpm lint`, `pnpm check-types`, `pnpm test`를 통과한다.
- [x] fixture object가 `satisfies` 기반 계약 검증을 통과한다(불필요 key/누락 key 컴파일 차단).
- [x] `test-fixtures` 패키지에 최소 1개 이상 contract/spec 테스트가 존재하며 `passWithNoTests` 제거 여부가 결정된다.

## Success Metrics

- Step 5 전용 신규/보강 테스트가 실패 경로를 포함해 최소 10개 이상 추가된다.
- fixture 소비 테스트에서 2/3/4인 시나리오 각각 최소 1개 이상 통과한다.
- 결정론 테스트에서 flaky 재현(동일 입력 불일치) 0건.

## Dependencies & Risks

### Dependencies

- Step 4 `apply-command` 인터페이스가 안정적으로 유지되어야 한다.
- shared-types command/event/state 계약이 이미 고정되어 있어야 한다.

### Risks

- Risk: server concern(idempotency/version conflict)이 Step 5 테스트에 섞여 경계가 흐려질 수 있음
- Mitigation: Step 5 시나리오는 순수 상태전이에 한정하고, server concern은 Step 6 테스트로 분리

- Risk: fixture-builder 이원화가 계속되면 유지보수 비용 증가
- Mitigation: canonical builder를 `test-fixtures`로 통일하고 rule-engine helper는 adapter/점진 이전 전략 사용

- Risk: fixture 변경이 package 내부에서 검증되지 않아 회귀 누락
- Mitigation: fixture package 자체 spec 도입 후 `passWithNoTests` 제거

- Risk: scenario 입력 크기 무제한으로 CI 시간 급증 또는 메모리 사용 급증
- Mitigation: fixture 계약에 command/deck 크기 upper bound를 두고 위반 시 즉시 실패

- Risk: 과도한 추상화로 Step 5 범위를 넘는 테스트 프레임워크화 발생
- Mitigation: 공통 helper는 `runScenario` + invariant assert 최소 세트로 제한

## Validation Plan

필수 검증:

```bash
pnpm lint
pnpm check-types
pnpm test
```

패키지 단위 집중 검증(개발 중 반복):

```bash
pnpm --filter @repo/test-fixtures test
pnpm --filter @repo/rule-engine test
```

권장 검증:

```bash
pnpm test:coverage
```

## References

### Internal

- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:141`
- `packages/rule-engine/tests/application/apply-command.spec.ts:20`
- `packages/rule-engine/tests/determinism/apply-command.determinism.spec.ts:12`
- `packages/rule-engine/tests/helpers/state.factory.ts:20`
- `packages/test-fixtures/src/builders/game-state.builder.ts:20`
- `packages/test-fixtures/src/index.ts:5`
- `packages/test-fixtures/vitest.config.ts:10`
- `docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md:42`
- `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md:48`

### Related Plans

- `docs/plans/2026-02-12-feat-splendor-domain-policy-implementation-plan.md`
- `docs/plans/2026-02-12-feat-apply-command-state-transition-plan.md`

### External

- [Vitest v3.2.4 - Test Context (`test.extend`)](https://github.com/vitest-dev/vitest/blob/v3.2.4/docs/guide/test-context.md)
- [Vitest v3.2.4 - Projects in Monorepo](https://github.com/vitest-dev/vitest/blob/v3.2.4/docs/guide/projects.md)
- [TypeScript 4.9 Release Notes - `satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- [TypeScript Handbook/Release Notes - Utility Types (`Partial`, `Readonly`, `Record`, `Pick`)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html)
