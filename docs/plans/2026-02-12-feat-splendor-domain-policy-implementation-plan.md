---
title: "feat: Splendor 도메인 정책 구현 (DD-0002 Step 3)"
type: feat
date: 2026-02-12
---

# ✨ feat: Splendor 도메인 정책 구현 (DD-0002 Step 3)

## Enhancement Summary

**Technical review run:** 2026-02-12  
**Deepened on:** 2026-02-12  
**Sections enhanced:** 8

### Key Improvements
1. Step 3 진행 블로커였던 정책 의사결정(복수 귀족, 종료 동률, final round 종료 시점)을 명시적으로 고정했다.
2. Step 4/6과 바로 연결 가능한 `PolicyResult`/실패코드 표준을 계획에 추가했다.
3. 정책 테스트를 단위/결정론/시나리오 계층으로 분해해 누락 가능성을 줄였다.

### Technical Review Findings (Resolved In This Revision)

1. **[P1] 복수 귀족 동시 자격 처리 규칙 미고정**  
   - 기존 초안은 "결정 필요" 상태여서 Step 3 구현 착수 시 분기 해석 위험이 있었다.  
   - 조치: `Decision Locks` 섹션에서 MVP deterministic 규칙을 고정했다.

2. **[P1] 동점 처리 규칙 미명시**  
   - 점수 동률 시 승자 계산 기준이 비어 있어 `scoring.policy.ts` 구현이 임의 해석될 위험이 있었다.  
   - 조치: 공식 규칙 기준의 우선순위를 계획에 고정했다.

3. **[P2] 정책 실패코드 표준 부재**  
   - "string enum" 수준 설명만 있고 중앙 타입 위치가 없어 Step 4/6에서 코드 드리프트가 예상됐다.  
   - 조치: `policy-error-code.ts`를 명시하고 도메인별 코드 네임스페이스를 정의했다.

## Overview

`DD-0002`의 Step 3(도메인 정책 구현)을 독립 실행 가능한 계획으로 구체화한다. 목표는 `rule-engine` 정책 레이어를 완성해 Phase 1 커맨드(`TAKE_TOKENS`, `RESERVE_CARD`, `BUY_CARD`, `END_TURN`) 판정을 순수 함수로 고정하고, Step 4(`apply-command`) 및 Step 6(`game-server`)가 정책 호출/오케스트레이션만 수행하도록 경계를 유지하는 것이다.

## Problem Statement / Motivation

현재 Step 1(카탈로그)과 Step 2(shared-types 계약)는 반영되어 있으나 Step 3 핵심 정책 파일이 모두 스텁 상태다.

- `packages/rule-engine/src/domain/economy/economy.policy.ts` (0 line)
- `packages/rule-engine/src/domain/card-market/card-market.policy.ts` (0 line)
- `packages/rule-engine/src/domain/turn/turn.policy.ts` (0 line)
- `packages/rule-engine/src/domain/nobles/nobles.policy.ts` (0 line)
- `packages/rule-engine/src/domain/scoring/scoring.policy.ts` (0 line)

연쇄 영향:
- Step 4 `packages/rule-engine/src/application/apply-command.ts`가 정책 조합을 시작할 수 없다.
- Step 6 `apps/game-server/src/application/services/game-command.service.ts`가 룰 위임 경계를 고정할 수 없다.

## Stakeholders

- End users: 룰 일관성과 치팅 방지의 직접 수혜자
- Server developers: 룰 계산 재구현 없이 오케스트레이션만 수행해야 함
- QA/maintainers: 경계 위반 없이 결정론 테스트로 회귀를 감시해야 함

## Proposed Solution

### A. 정책 계약(Contract)부터 고정

대상 파일:
- `packages/rule-engine/src/domain/policy-error-code.ts` (신규)
- `packages/rule-engine/src/domain/economy/economy.policy.ts`
- `packages/rule-engine/src/domain/card-market/card-market.policy.ts`
- `packages/rule-engine/src/domain/turn/turn.policy.ts`
- `packages/rule-engine/src/domain/nobles/nobles.policy.ts`
- `packages/rule-engine/src/domain/scoring/scoring.policy.ts`

정책 함수 공통 형태:
- 입력: `GameState`, `Command`의 도메인 payload, 필요한 catalog/context
- 출력: `PolicyResult<T>`
  - 성공: `ok: true`, 계산된 변화량/메타
  - 실패: `ok: false`, `code: PolicyErrorCode`

```ts
// packages/rule-engine/src/domain/policy-error-code.ts (planned)
export type PolicyErrorCode =
  | "ECONOMY_INVALID_TAKE_PATTERN"
  | "ECONOMY_TOKEN_LIMIT_EXCEEDED"
  | "ECONOMY_INSUFFICIENT_FUNDS"
  | "MARKET_CARD_NOT_AVAILABLE"
  | "MARKET_RESERVE_LIMIT_REACHED"
  | "TURN_NOT_CURRENT_PLAYER"
  | "TURN_END_NOT_ALLOWED"
  | "NOBLE_NOT_ELIGIBLE"
  | "SCORING_TIEBREAKER_UNRESOLVED";
```

### B. 도메인별 정책 책임 분리

1. `economy.policy.ts`
- `TAKE_TOKENS` 유효성(3색 1개 / 동일색 2개(은행 4개 이상) / 10개 한도)
- `returnedTokens`와 획득 토큰의 원자적 일관성 검증
- `BUY_CARD` 결제 가능성 검증(보너스 + 토큰 + gold 대체)

2. `card-market.policy.ts`
- 예약 타깃 검증(`OPEN_CARD`, `DECK_TOP`)
- 구매 소스 검증(`OPEN_MARKET`, `RESERVED`)
- 카드 소비 후 리필 필요 계산(실행은 Step 4)

3. `nobles.policy.ts`
- 구매 후 귀족 방문 자격 계산
- 동시 자격 시 deterministic 선택

4. `turn.policy.ts`
- 턴 소유권/명령 타이밍 검증
- `END_TURN` 시 next player/round 계산
- final round 시작/종료 체크포인트 계산

5. `scoring.policy.ts`
- 점수 합산(개발 카드 + 귀족)
- 15점 도달 트리거
- 동점 처리

### C. Decision Locks (Step 3 착수 전 고정)

1. **복수 귀족 동시 자격 (MVP 정책)**
- 동일 턴에 복수 귀족 자격을 만족하면 `openNobleIds` 기준 사전순 최소 ID 1개를 자동 부여한다.
- 이유: 현재 커맨드 집합에 `CHOOSE_NOBLE`가 없고 서버 권위 + 결정론을 우선해야 한다.

2. **동점 처리**
- 1차: 최고 점수
- 2차: 보유 개발 카드 수가 더 적은 플레이어 우선
- 3차: 여전히 동률이면 공동 승자(`winnerPlayerIds`에 다중 ID)

3. **Final round 종료 시점**
- 어떤 플레이어가 자신의 턴 종료 시점에 15점 이상이면 `finalRound=true`와 `endTriggeredByPlayerId`를 기록한다.
- 이후 턴 진행 중 `nextPlayerId === endTriggeredByPlayerId`가 되는 시점에 게임 종료한다.

4. **덱 탑 리필 결정론**
- 리필 카드 선택은 `seed + currentVersion + tier` 기반 deterministic draw 규칙으로 고정한다.
- policy는 draw index 계산만 반환하고 실제 deck mutation은 Step 4에서 수행한다.

### D. Implementation Phases (Step 3 내부)

#### Phase 1: Contract & Error Codes
- `policy-error-code.ts` 추가
- 각 정책 파일의 함수 시그니처/결과 타입 통일

#### Phase 2: Core Policy Logic
- economy/card-market/turn 우선 구현
- nobles/scoring 후속 구현
- 도메인 간 직접 state mutation 금지

#### Phase 3: Tests First Completion
- 정책별 단위 테스트
- 결정론 테스트
- 2/3/4인 시나리오 픽스처 연동

#### Phase 4: Step 4/6 Handoff Prep
- `apply-command` 조합을 위한 결과 payload shape 확정
- `game-server`가 소비할 실패코드 맵 문서화

## Research Insights

### Best Practices

- 실패코드는 문자열 상수 집합을 중앙 파일에서 관리해 application layer drift를 막는다.
- 정책 함수는 "검증 + 계산 결과 산출"까지만 수행하고 상태 mutation은 상위 orchestrator가 담당한다.
- 동점/복수 자격 같은 해석 충돌 구간은 plan 단계에서 deterministic rule을 잠가 재작업을 방지한다.

### Performance Considerations

- 카드/귀족 자격 판정은 전체 스캔보다 사전 계산된 wallet/balance를 재사용한다.
- 결제 검증은 색상 5개 고정 루프를 사용해 allocation 없이 계산한다.
- 결정론 테스트는 랜덤 호출 횟수까지 검증해 숨은 비결정성(시간/Math.random)을 차단한다.

### Edge Cases

- 은행 토큰이 부족해 동일색 2개 획득 조건 불충족
- 토큰 10개 초과 시 반납이 부족하거나 과도한 경우
- 예약 슬롯 가득 찬 상태에서 추가 예약 시도
- 마지막 라운드 중 다중 플레이어 15점 돌파
- 카드 수 동률까지 완전 동점인 공동 승자

## SpecFlow Analysis

### Core Flow
1. `TAKE_TOKENS` → economy 검증/계산
2. `RESERVE_CARD` → card-market 검증 + gold 수령/리필 필요 계산
3. `BUY_CARD` → economy 결제 + card-market 소스 검증 + nobles/scoring 계산
4. `END_TURN` → turn/scoring로 라운드/종료 판단

### Failure Flow Matrix

- `TAKE_TOKENS` invalid pattern → `ECONOMY_INVALID_TAKE_PATTERN`
- `TAKE_TOKENS` after return still >10 → `ECONOMY_TOKEN_LIMIT_EXCEEDED`
- `BUY_CARD` insufficient funds → `ECONOMY_INSUFFICIENT_FUNDS`
- `RESERVE_CARD` target missing → `MARKET_CARD_NOT_AVAILABLE`
- `END_TURN` by non-current player → `TURN_NOT_CURRENT_PLAYER`

## Test Strategy (Deepened)

신규 테스트 파일:
- `packages/rule-engine/tests/rules/economy.policy.spec.ts`
- `packages/rule-engine/tests/rules/card-market.policy.spec.ts`
- `packages/rule-engine/tests/rules/nobles.policy.spec.ts`
- `packages/rule-engine/tests/rules/turn.policy.spec.ts`
- `packages/rule-engine/tests/rules/scoring.policy.spec.ts`
- `packages/rule-engine/tests/determinism/policy-determinism.spec.ts`

픽스처 연동(신규/수정):
- `packages/test-fixtures/src/builders/game-state.builder.ts`
- `packages/test-fixtures/src/builders/command.builder.ts`
- `packages/test-fixtures/src/scenarios/two-player/final-round-tiebreak.fixture.ts` (신규)
- `packages/test-fixtures/src/scenarios/three-player/noble-double-eligibility.fixture.ts` (신규)
- `packages/test-fixtures/src/scenarios/four-player/token-limit-return.fixture.ts` (신규)

결정론 검증 포인트:
- 동일 `state + command + seed`에서 결과 객체 완전 동일
- deck-top draw index 계산 결과 동일
- 실패코드 동일

## Technical Considerations

- Server-authoritative/결정론 원칙 준수: `ARCHITECTURE.md:20`
- 허용 의존성 준수(`presentation -> application -> domain -> types`): `docs/concerns-and-boundaries.md:40`
- `application`에서 infra 구현 직접 import 금지: `docs/concerns-and-boundaries.md:81`

- 선행 데이터 활용:
  - 카드 카탈로그/티어 분포: `packages/rule-engine/src/domain/card-market/card.catalog.ts:1189`
  - 귀족 카탈로그: `packages/rule-engine/src/domain/nobles/noble.catalog.ts:12`
  - 2~4인 세팅: `packages/rule-engine/src/domain/lobby/setup.catalog.ts:9`

- Step 2 계약 활용:
  - `packages/shared-types/src/command/take-tokens.command.ts:6`
  - `packages/shared-types/src/command/reserve-card.command.ts:18`
  - `packages/shared-types/src/command/buy-card.command.ts:16`
  - `packages/shared-types/src/event/turn-ended.event.ts:4`
  - `packages/shared-types/src/event/game-ended.event.ts:9`

## Acceptance Criteria

- [x] `packages/rule-engine/src/domain/policy-error-code.ts`를 추가하고 정책 실패코드를 중앙 정의한다.
- [x] `packages/rule-engine/src/domain/economy/economy.policy.ts`가 토큰 획득/반납/결제를 순수 함수로 판정한다.
- [x] `packages/rule-engine/src/domain/card-market/card-market.policy.ts`가 예약/구매/리필 필요 계산을 구현한다.
- [x] `packages/rule-engine/src/domain/nobles/nobles.policy.ts`가 복수 자격 deterministic 1개 선택을 구현한다.
- [x] `packages/rule-engine/src/domain/turn/turn.policy.ts`가 final round 종료 체크포인트(`nextPlayerId === endTriggeredByPlayerId`)를 구현한다.
- [x] `packages/rule-engine/src/domain/scoring/scoring.policy.ts`가 동점 처리(점수 > 카드수 적음 > 공동승리)를 구현한다.
- [x] 신규 테스트 파일 6개가 추가되고 최소 20개 케이스를 포함한다.
- [x] 신규 fixture 파일 3개가 추가되고 2/3/4인 엣지 시나리오를 검증한다.
- [x] `pnpm lint`, `pnpm check-types`, `pnpm test`를 통과한다.

## Success Metrics

- 정책 단위 테스트 20+ 통과
- 결정론 테스트 불일치 0건
- Step 4 착수 시 정책 시그니처 변경 0건
- 경계 위반 lint(`no-restricted-imports`) 0건

## Dependencies & Risks

Dependencies:
- 선행: Step 1 카탈로그, Step 2 shared-types 계약
- 후속: Step 4 `apply-command`, Step 6 `game-server` 연결

Risks:
- 정책 잠금 규칙이 제품 의도와 다를 가능성
- fixture 미비로 회귀 케이스 누락 가능성
- 실패코드 네임스페이스가 과세분화될 가능성

Mitigation:
- Step 3 시작 PR에서 Decision Locks 재확인
- 실패코드 prefix 규약(`ECONOMY_`, `MARKET_`, `TURN_`, `NOBLE_`, `SCORING_`) 고정
- 정책 PR마다 음수 케이스 비율 40% 이상 유지

## References & Research

Internal references:
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:112`
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:124`
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:186`
- `ARCHITECTURE.md:20`
- `docs/concerns-and-boundaries.md:40`
- `docs/concerns-and-boundaries.md:81`
- `packages/rule-engine/src/domain/card-market/card.catalog.ts:1189`
- `packages/rule-engine/src/domain/nobles/noble.catalog.ts:12`
- `packages/rule-engine/src/domain/lobby/setup.catalog.ts:9`
- `packages/rule-engine/tests/rules/catalog.spec.ts:13`
- `packages/rule-engine/tests/determinism/apply-command.determinism.spec.ts:5`
- `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md:42`

Research decision:
- 외부 리서치 미실시. 본 요청은 내부 아키텍처/경계/기존 계약 문서로 구현 기준을 충분히 확정할 수 있는 범위로 판단했다.
