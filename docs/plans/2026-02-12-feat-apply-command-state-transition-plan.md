---
title: "feat: apply-command 상태전이 구현 (DD-0002 Step 4)"
type: feat
date: 2026-02-12
---

# ✨ feat: apply-command 상태전이 구현 (DD-0002 Step 4)

## Enhancement Summary

**Deepened on:** 2026-02-12  
**Technical review run:** 2026-02-12  
**Sections enhanced:** 9  
**Research sources:** Internal docs/code + official TypeScript/Vitest/MS docs

### Key Improvements
1. Step 4와 Step 6 책임 경계를 명시적으로 분리했다.
2. 상태 게이트(`IN_PROGRESS`), seed 단일 소스(`state.seed`)를 강제해 결정론/무결성 리스크를 줄였다.
3. 이벤트/스냅샷 버전 불일치를 방지하는 원자성 규칙과 테스트 품질 게이트를 구체화했다.

### Technical Review Findings (Resolved in this revision)
1. `[P1] 타입 import 경계 오류` 해결  
- `PolicyErrorCode`를 `@repo/shared-types`에서 가져오는 잘못된 제안을 제거하고, `rule-engine` 내부 타입(`../domain/policy-error-code.js`) 기준으로 수정했다.

2. `[P1] Step 4 테스트 범위에 Step 6 책임 혼합` 해결  
- `version-conflict`/idempotency 시나리오는 Step 6(`game-server application`) 범위로 이동시키고, Step 4 테스트는 순수 상태전이/결정론/이벤트 일관성 중심으로 재정의했다.

3. `[P1] 게임 상태 게이트 누락` 해결  
- `applyCommand` 공통 진입에 `state.status === "IN_PROGRESS"` 선행 검증을 추가했다.

4. `[P2] seed 이중 소스 위험` 해결  
- `ApplyCommandInput.seed`를 제거하고 `state.seed`만 허용하도록 설계를 고정했다.

## Overview

`DD-0002`의 Step 4(`apply-command` 상태전이 엔진 구현)를 독립 실행 가능한 계획으로 고정한다. 목표는 `GameState + Command (+ deterministic context)`를 받아 `GameEvent[]`와 `nextState`를 일관되게 산출하는 단일 진입점을 완성하고, Step 6(`game-server`)가 오케스트레이션만 수행하도록 경계를 유지하는 것이다.

## Section Manifest

Section 1: Overview/Problem - Step 4 범위와 Step 6 경계 명확화  
Section 2: Flow Spec - 커맨드별 상태전이/실패 흐름 정밀화  
Section 3: Contract - 입력/출력 타입, 실패코드, import 경계 확정  
Section 4: Determinism & Integrity - seed/버전/원자성/상태 게이트 규칙 고정  
Section 5: Implementation Phases - 구현 순서와 게이트  
Section 6: Test Strategy - Step 4 전용 테스트와 Step 6 이관 범위 분리  
Section 7: Risks - 구조/성능/보안/운영 리스크 및 완화  
Section 8: Acceptance Criteria - 측정 가능한 완료 조건  
Section 9: References - 내부 학습 + 공식 문서 근거

## Idea Refinement Notes

- 브레인스토밍 확인 결과: `docs/brainstorms/2026-02-12-solo-bot-hybrid-brainstorm.md` 1건만 존재하며, 본 요청(`apply-command` 상태전이)과 주제가 달라 미적용.
- 사용자 요청이 Step 4를 명시하고 있어 추가 아이디어 정제 질의 없이 바로 계획 단계로 진행.

## Research Decision

- 로컬 근거를 우선 사용하고, 설계 안정성 보강이 필요한 항목(타입 소진검사, 테스트 결정론, 이벤트 소싱 원칙, 랜덤성 제약)만 공식 문서로 보강했다.
- 외부 리서치는 내부 아키텍처를 대체하지 않고 guardrail 검증 용도로 제한 적용했다.

## Research Findings (Local)

1. Step 4 대상 파일이 비어 있음
- `packages/rule-engine/src/application/apply-command.ts`가 0 line
- `packages/rule-engine/src/index.ts`는 `apply-command` export 미포함 (`validate-command`만 export)

2. Step 3 정책 함수는 구현 완료 상태
- 토큰/결제 규칙: `packages/rule-engine/src/domain/economy/economy.policy.ts:73`
- 예약/구매 소스/결정론 덱탑 선택: `packages/rule-engine/src/domain/card-market/card-market.policy.ts:61`
- 턴/final round 판정: `packages/rule-engine/src/domain/turn/turn.policy.ts:24`
- 귀족 자동 방문(복수 자격 시 deterministic 정렬): `packages/rule-engine/src/domain/nobles/nobles.policy.ts:20`
- 점수/승자 해석: `packages/rule-engine/src/domain/scoring/scoring.policy.ts:110`

3. shared-types 계약은 Step 4 입력/출력에 필요한 형태로 이미 고정됨
- Command union: `packages/shared-types/src/command/command.type.ts:6`
- Event union: `packages/shared-types/src/event/event.type.ts:8`
- GameState final round 메타: `packages/shared-types/src/state/game.state.ts:12`

4. 테스트 공백
- 현재 determinism 테스트는 `validateCommandEnvelope`만 검증 (`packages/rule-engine/tests/determinism/apply-command.determinism.spec.ts:3`)
- `apply-command` 자체 성공/실패/버전 증가/이벤트 순서 테스트가 없음

5. Institutional learnings 반영 포인트
- 불필요 반납/부분 점수맵 같은 입력 누락은 policy 레벨에서 명시 실패로 강제해야 함 (`docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md:42`)
- 계약 드리프트 방지를 위해 canonical field 단일화와 음수 타입 테스트를 유지해야 함 (`docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md:42`)

### Additional Research Insights (Official Docs)

**Best Practices**
- TypeScript discriminated union + exhaustive check(`never`)로 command handler 누락을 컴파일 시점에 차단한다.
- Vitest fake timers와 `setSystemTime`를 활용해 시간 의존 테스트를 완전 결정론적으로 만든다.
- 이벤트 소싱 패턴의 핵심인 append-only 이벤트 + 재구성 가능한 상태를 Step 4 설계 기준으로 유지한다.

**Determinism Guardrail**
- `Math.random()`은 사용자 지정 seed를 지원하지 않으므로 상태전이 엔진의 결정론 소스로 사용하면 안 된다.

**References**
- TypeScript Handbook (Discriminated Unions / Exhaustiveness):  
  https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions  
  https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
- Vitest Mocking Timers / Mocking Date:  
  https://vitest.dev/guide/mocking/timers  
  https://vitest.dev/guide/mocking
- Azure Architecture - Event Sourcing pattern:  
  https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- MDN - `Math.random()` seed 제어 불가:  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

## Problem Statement / Motivation

현재 Step 3 정책 계층은 준비됐지만 Step 4 조합 계층이 비어 있어 실제 상태전이가 불가능하다. 이 상태에서는 커맨드별 정책 검증 결과를 이벤트/스냅샷으로 일관되게 연결할 수 없고, Step 6의 서버 오케스트레이션도 시작할 수 없다.

추가로, 상태전이 엔진 없이 정책 함수를 직접 여기저기 호출하면 다음 위험이 커진다.

- 이벤트 버전 증가 규칙 불일치
- 실패코드 매핑 드리프트
- 최종 상태와 이벤트 로그 불일치
- 결정론 훼손(`seed`, `version`, `tier` 기반 draw 규칙 누락)

## SpecFlow Analysis

### Core Flow

1. 공통 진입
- `applyCommand(input)`에서 envelope/기본 불변식 검사
- `state.status === "IN_PROGRESS"` 선행 검사 (아니면 즉시 실패)
- `command.gameId === state.gameId` 선행 검사
- 실패 시 이벤트 없이 실패 코드 반환

2. `TAKE_TOKENS`
- `evaluateTakeTokens` 호출
- 성공 시 `TOKENS_TAKEN` 이벤트 1개 생성
- 플레이어 지갑/은행 토큰/버전 갱신

3. `RESERVE_CARD`
- `target.kind === DECK_TOP`이면 deterministic deck-top 선택
- `evaluateReserveCard` 호출 후 gold 수령/반납을 토큰 델타로 적용
- `CARD_RESERVED` 이벤트 생성, 시장 카드 제거/리필 반영

4. `BUY_CARD`
- `evaluateBuySource` + 카드 카탈로그 조회 + `evaluateBuyPayment`
- 카드 이동(오픈/예약 -> 구매), 토큰 결제 반영
- `evaluateNobleVisit`/`evaluatePlayerScore`/`evaluateFinalRoundTrigger` 순서로 후속 판정
- `CARD_BOUGHT` 이벤트 생성, 필요 시 귀족/점수/final round 메타 갱신

5. `END_TURN`
- `evaluateEndTurn`로 next player/turn/round 계산
- `TURN_ENDED` 이벤트 생성
- `shouldEndGame`이면 `resolveGameWinners`로 `GAME_ENDED` 이벤트 추가

### Failure Flow Matrix

- 잘못된 envelope -> `COMMAND_ENVELOPE_INVALID`
- 정책 실패 -> `POLICY_VIOLATION` + `policyCode`
- 잘못된 게임 상태(`WAITING`/`ENDED`) -> `STATE_NOT_ACTIVE`
- 상태 불일치(예: actor/playerOrder 누락) -> `STATE_INVARIANT_BROKEN`
- 내부 조합 실패(예: 이벤트 생성은 되었지만 state patch 불가) -> `TRANSITION_BUILD_FAILED`

## Proposed Solution

### A. `apply-command` 공개 계약 고정

대상 파일:
- `packages/rule-engine/src/application/apply-command.ts`
- `packages/rule-engine/src/index.ts`

제안 타입:

```ts
// packages/rule-engine/src/application/apply-command.ts (planned)
import type { Command, GameEvent, GameState } from "@repo/shared-types";
import type { PolicyErrorCode } from "../domain/policy-error-code.js";

export interface ApplyCommandInput {
  state: GameState;
  command: Command;
  playerOrder: readonly string[];
  deckCardIdsByTier?: Partial<Record<1 | 2 | 3, readonly string[]>>;
}

export type ApplyCommandResult =
  | {
      ok: true;
      events: GameEvent[];
      nextState: GameState;
    }
  | {
      ok: false;
      code:
        | "COMMAND_ENVELOPE_INVALID"
        | "POLICY_VIOLATION"
        | "STATE_NOT_ACTIVE"
        | "STATE_INVARIANT_BROKEN"
        | "TRANSITION_BUILD_FAILED";
      policyCode?: PolicyErrorCode;
      reason?: string;
    };
```

### B. 명령별 상태전이 핸들러 테이블화

핸들러 스켈레톤:

```ts
// packages/rule-engine/src/application/apply-command.ts (planned)
const handlers = {
  TAKE_TOKENS: applyTakeTokensTransition,
  RESERVE_CARD: applyReserveCardTransition,
  BUY_CARD: applyBuyCardTransition,
  END_TURN: applyEndTurnTransition,
} as const;
```

핵심 규칙:
- 모든 핸들러는 `PolicyResult` 실패를 `POLICY_VIOLATION`으로 매핑
- 성공 시 `events`와 `nextState`를 동시에 구성
- 이벤트 버전은 `state.version + 1`부터 순차 증가
- `nextState.version === 마지막 이벤트 version`
- `switch(command.type)`에 `assertNever`를 넣어 미처리 커맨드를 컴파일 타임에 실패시킴

### C. 이벤트 생성/상태 패치의 원자성 보장

- 핸들러 내부에서 "정책 결과 -> 이벤트 payload -> 상태 patch" 순서로 단일 함수에서 계산
- 이벤트만 생성하고 상태 patch를 나중에 하는 분리 패턴 금지
- `GameEvent[]`와 `nextState`가 서로 모순되면 즉시 실패(`TRANSITION_BUILD_FAILED`)
- 상태 패치 결과를 기준으로 final invariant 검증:
  - `nextState.gameId === state.gameId`
  - `nextState.version >= state.version`
  - `nextState.currentPlayerId`는 `players` 키 집합에 존재

### D. 결정론 보장 포인트

- 덱탑 선택은 반드시 `selectDeckTopCardDeterministically`를 통해 계산 (`packages/rule-engine/src/domain/card-market/card-market.policy.ts:174`)
- `Date.now()`, `Math.random()` 사용 금지
- seed는 `state.seed` 단일 소스만 사용
- 동일 입력(`state`, `command`, `playerOrder`, `deckCardIdsByTier`)이면 결과 객체 완전 동일

### E. Step 6 연계를 위한 최소 인터페이스

- `index.ts`에서 `applyCommand` export 추가
- game-server는 Step 6에서 이 함수만 호출하고 idempotency/version/conflict는 application 레이어에서 선행 처리
- Step 4에서는 expectedVersion 충돌 의미론을 구현하지 않음(테스트도 Step 6로 분리)

## Implementation Phases

### Phase 1: 계약/스켈레톤

- `ApplyCommandInput`, `ApplyCommandResult` 타입 정의
- command type switch/handler table 구성
- 공통 envelope 검사 연결 (`validateCommandEnvelope`)
- 공통 게이트 추가:
  - gameId 일치
  - `IN_PROGRESS` 상태 강제

### Phase 2: 핸들러 구현

- `TAKE_TOKENS` 전이 구현
- `RESERVE_CARD` 전이 구현(오픈/덱탑 + gold/반납 + 리필)
- `BUY_CARD` 전이 구현(결제/귀족/점수/final round)
- `END_TURN` 전이 구현(턴 이벤트 + 종료 이벤트 조건부 생성)

### Phase 2.5: Invariant/Helper 정리

- 공통 helper:
  - `nextEventVersion(state, eventsCount)`
  - `cloneStateForTransition(state)` (불변 업데이트 안전성)
  - `assertTransitionInvariant(before, after, events)`
- 커맨드별 handler는 side-effect 없는 순수 함수 유지

### Phase 3: 테스트 확장

- `packages/rule-engine/tests/application/apply-command.spec.ts` 신규
- `packages/rule-engine/tests/determinism/apply-command.determinism.spec.ts`를 실제 `applyCommand` 기준으로 전환
- 픽스처 재사용:
  - `packages/test-fixtures/src/scenarios/two-player/basic-flow.fixture.ts:11`
  - `packages/test-fixtures/src/scenarios/three-player/noble-double-eligibility.fixture.ts:9`
  - `packages/test-fixtures/src/scenarios/four-player/token-limit-return.fixture.ts:9`

테스트 관점:
- Positive:
  - 4개 커맨드 각각 최소 2개 성공 케이스
  - `END_TURN` + `GAME_ENDED` 다중 이벤트 버전 연속성
- Negative:
  - 잘못된 envelope
  - 상태 게이트(`WAITING`, `ENDED`)
  - policy failure 매핑
  - invariant 실패 방어
- Determinism:
  - 동일 입력 2회 실행 결과 deep-equal
  - 덱탑 선택 deterministic index 일관성

### Phase 4: handoff 준비

- `apply-command` export 확정 후 Step 6(`game-server`) 계획과 시그니처 동기화
- 실패코드 매핑 표를 문서에 추가(서버 에러 응답 규약 연결용)

## Out of Scope (Step 6 Ownership)

- `idempotencyKey` 중복 처리
- `expectedVersion` 충돌 처리 및 재시도 프로토콜
- persistence transaction(events append + snapshot write)
- gateway/auth/session 수준 검사

위 항목은 `apps/game-server/src/application/**`에서 처리한다.

## Technical Considerations

- 아키텍처 경계 준수:
  - `rule-engine`는 순수 함수 유지 (`ARCHITECTURE.md:27`)
  - 레이어 흐름 `presentation -> application -> domain -> types` 유지 (`docs/concerns-and-boundaries.md:40`)
  - `domain`에서 infra 의존 금지 (`docs/concerns-and-boundaries.md:47`)

- 계약 일관성:
  - `TURN_ENDED`는 `turnNumber` canonical 유지 (`packages/shared-types/src/event/turn-ended.event.ts:11`)
  - `GAME_ENDED`의 trigger metadata 유지 (`packages/shared-types/src/event/game-ended.event.ts:17`)

- 정책 실패코드 재사용:
  - `PolicyErrorCode`를 wrapping하되 임의 문자열 추가 금지 (`packages/rule-engine/src/domain/policy-error-code.ts:1`)

### Research Insights

**Type Safety**
- command 핸들러는 discriminated union + exhaustive switch를 사용해 신규 command 타입 추가 시 컴파일 오류로 누락을 감지한다.

**Performance**
- 각 전이는 토큰 색상(6), 귀족/플레이어 컬렉션의 선형 스캔 수준으로 제한해 O(n) 내에서 종료되도록 유지한다.
- deep clone 남용 대신 필요한 서브트리만 copy-on-write로 갱신한다.

**Reliability**
- `nextState`는 이벤트 적용 결과와 동치여야 하며, 테스트에서 "event replay equivalence"를 별도 검증한다.

**Security**
- 외부 입력(command payload)은 envelope + policy 이중 검증을 유지한다.
- 실패 코드에서 내부 구조/민감 정보 노출 금지(코드 + 짧은 reason만 반환).

## Acceptance Criteria

- [x] `packages/rule-engine/src/application/apply-command.ts`가 4개 커맨드 타입을 모두 처리한다.
- [x] 성공 시 `events`와 `nextState`를 함께 반환하고, `nextState.version`이 마지막 이벤트 버전과 동일하다.
- [x] 실패 시 `ApplyCommandResult.ok=false`로 통일되며 `POLICY_VIOLATION`일 때 `policyCode`가 채워진다.
- [x] `state.status !== "IN_PROGRESS"`인 입력은 `STATE_NOT_ACTIVE`로 거부되고 이벤트가 생성되지 않는다.
- [x] seed는 `state.seed`만 사용하며 외부 seed 인자를 받지 않는다.
- [x] `RESERVE_CARD`의 `DECK_TOP` 분기에서 deterministic deck-top 선택이 적용된다.
- [x] `BUY_CARD` 전이에서 결제, 카드 이동, 귀족 방문, 점수/finalRound 메타 반영이 일관되게 처리된다.
- [x] `END_TURN`에서 `TURN_ENDED`와 조건부 `GAME_ENDED` 생성 규칙이 고정된다.
- [x] `packages/rule-engine/src/index.ts`에서 `applyCommand`가 export된다.
- [x] 신규 테스트(`packages/rule-engine/tests/application/apply-command.spec.ts`)가 성공/실패/이벤트버전/결정론 케이스를 포함한다.
- [x] Step 4 테스트는 version conflict/idempotency 의미론을 포함하지 않고, 해당 케이스는 Step 6 테스트에 남겨둔다.
- [x] `pnpm lint`, `pnpm check-types`, `pnpm test` 통과를 완료 조건으로 유지한다.

## Success Metrics

- apply-command 경로 테스트 최소 15개 통과
- 결정론 테스트 불일치 0건
- Step 6 구현 시 `applyCommand` 시그니처 변경 0건
- 이벤트/스냅샷 버전 불일치 회귀 0건

## Dependencies & Risks

Dependencies:
- 선행 완료: Step 2(shared-types), Step 3(domain policies)
- 후속 연결: Step 6(`apps/game-server/src/application/services/game-command.service.ts`)

Risks:
- `BUY_CARD` 전이가 과도하게 복잡해 단일 함수 비대화 가능
- 이벤트 payload와 state patch 중복 계산 시 drift 가능
- `playerOrder`/deck context 누락 시 `END_TURN`/`DECK_TOP` 분기 불안정 가능
- `GameState` 게이트 누락 시 종료 게임에 명령이 반영될 위험
- seed 주입 경로가 복수일 경우 재현 불가능 버그 발생 위험

Mitigations:
- 핸들러를 command별 private function으로 분리
- 이벤트/상태 업데이트용 공통 helper 사용
- 입력 컨텍스트 미충족 시 조기 실패(`STATE_INVARIANT_BROKEN`)
- 상태 게이트/seed 단일 소스를 테스트로 고정

## Review Agent Synthesis

아래 관점으로 심화 검토를 병합했다.

- `architecture-strategist`: Step 4/Step 6 책임 경계 분리, import 경계 명확화
- `spec-flow-analyzer`: 상태 게이트/실패 흐름 매트릭스 보강
- `kieran-typescript-reviewer`: exhaustive switch + `assertNever` 패턴 고정
- `performance-oracle`: copy-on-write/선형 스캔 기준, replay equivalence 검증 제안
- `security-sentinel`: 입력 검증 이중화 및 실패 응답 최소 노출 원칙 반영

## References & Research

Internal references:
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:79`
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:129`
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:137`
- `packages/rule-engine/src/application/apply-command.ts`
- `packages/rule-engine/src/application/validate-command.ts:13`
- `packages/rule-engine/src/domain/economy/economy.policy.ts:142`
- `packages/rule-engine/src/domain/card-market/card-market.policy.ts:125`
- `packages/rule-engine/src/domain/card-market/card-market.policy.ts:174`
- `packages/rule-engine/src/domain/nobles/nobles.policy.ts:20`
- `packages/rule-engine/src/domain/scoring/scoring.policy.ts:110`
- `packages/rule-engine/src/domain/turn/turn.policy.ts:24`
- `packages/shared-types/src/command/command.type.ts:6`
- `packages/shared-types/src/event/event.type.ts:8`
- `packages/shared-types/src/state/game.state.ts:12`
- `packages/rule-engine/tests/determinism/apply-command.determinism.spec.ts:3`
- `packages/test-fixtures/src/builders/command.builder.ts:18`
- `packages/test-fixtures/src/scenarios/two-player/basic-flow.fixture.ts:11`
- `packages/test-fixtures/src/scenarios/three-player/noble-double-eligibility.fixture.ts:9`
- `packages/test-fixtures/src/scenarios/four-player/token-limit-return.fixture.ts:9`

Institutional learnings:
- `docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md:42`
- `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md:42`

External research:
- TypeScript Handbook:  
  https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions  
  https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking
- Vitest Docs:  
  https://vitest.dev/guide/mocking/timers  
  https://vitest.dev/guide/mocking
- Azure Architecture Center (Event Sourcing):  
  https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- MDN `Math.random()`:  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
