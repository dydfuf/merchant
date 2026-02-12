---
title: "feat: Shared-types 계약 보강 (DD-0002 Step 2)"
type: feat
date: 2026-02-12
---

# ✨ feat: Shared-types 계약 보강 (DD-0002 Step 2)

## Overview

`DD-0002`의 구현 순서 중 Step 2(Shared Types 계약 보강)를 독립 작업으로 구체화한다.
목표는 `packages/shared-types`에서 Command/Event/State 계약을 선행 고정해 Step 3~6(도메인 정책, 상태전이, 서버 오케스트레이션)의 재작업을 줄이는 것이다.

## Problem Statement / Motivation

현재 계약은 Phase 1 스캐폴딩 수준이며, 다음 공백이 있다.

1. 예약 출처 표현 부족
- `RESERVE_CARD`는 `cardId + tier` 중심이라 덱 탑 예약을 1급 타입으로 표현하기 어렵다.
- 근거: `packages/shared-types/src/command/reserve-card.command.ts:6`

2. 토큰 10개 초과 반납 모델 부재
- `TAKE_TOKENS`는 획득 토큰만 표현하고, 초과 시 반납 의도를 같이 전달할 구조가 없다.
- 근거: `packages/shared-types/src/command/take-tokens.command.ts:6`

3. 종료 메타데이터 최소화
- `TURN_ENDED`/`GAME_ENDED`는 기본 필드만 있어 종료 라운드/트리거 원인 등 정책 연결 메타가 부족하다.
- 근거: `packages/shared-types/src/event/turn-ended.event.ts:4`, `packages/shared-types/src/event/game-ended.event.ts:9`

4. 소비 레이어가 아직 계약 중심이 아님
- `rule-engine`는 현재 generic envelope 검증 중심이며, 강화된 shared 계약이 들어갈 진입점이 필요하다.
- 근거: `packages/rule-engine/src/application/validate-command.ts:1`

## Proposed Solution

### A. 계약 확장 원칙 확정
- Additive-first: 기존 필드 제거보다 신규 필드/union 추가를 우선한다.
- Discriminated union: 모호한 boolean(`fromReserved` 등)을 분기 가능한 `source.kind`로 전환한다.
- Rule-engine 독립성 유지: shared-types는 순수 타입 패키지로 유지한다.

### B. Command 계약 보강
대상 파일:
- `packages/shared-types/src/command/reserve-card.command.ts`
- `packages/shared-types/src/command/take-tokens.command.ts`
- `packages/shared-types/src/command/buy-card.command.ts`
- `packages/shared-types/src/command/command.type.ts`

핵심 변경 설계:
- `RESERVE_CARD.payload.target`을 union으로 정의
  - `OPEN_CARD`: `cardId`, `tier`
  - `DECK_TOP`: `tier`
- 초과 반납 모델을 커맨드에 포함
  - `TAKE_TOKENS.payload.returnedTokens: Partial<Record<TokenColor, number>>` (optional)
  - `RESERVE_CARD.payload.returnedTokens: Partial<Record<TokenColor, number>>` (optional)
- `BUY_CARD.payload.source`를 union으로 전환해 예약 구매/오픈 구매를 불변식으로 표현
- `BUY_CARD.payload.fromReserved`는 호환 기간 없이 제거(비허용)

### C. Event/State 계약 보강
대상 파일:
- `packages/shared-types/src/event/card-reserved.event.ts`
- `packages/shared-types/src/event/turn-ended.event.ts`
- `packages/shared-types/src/event/game-ended.event.ts`
- `packages/shared-types/src/event/event.type.ts`
- `packages/shared-types/src/state/game.state.ts`

핵심 변경 설계:
- `CARD_RESERVED`에 예약 출처(`OPEN_CARD`/`DECK_TOP`)와 골드 수령 결과를 명시
- `TURN_ENDED`에 턴 메타(`turnNumber`, 필요 시 `roundNumber`)를 고정
- `GAME_ENDED`에 종료 트리거 메타(예: 목표점수 도달 주체/최종 라운드 종료 시점)를 고정
- 동점 해소(tie-break) 근거 메타는 Step 2 범위에서 제외하고 Step 3에서 정책으로 확정
- `GameState`에 종료 판정에 필요한 최소 read-model 메타(예: `finalRound`, `endTriggeredAtTurn`) 반영 여부 결정

### D. 계약 테스트/소비자 정합성 확보
대상 파일(신규/수정):
- `packages/shared-types/tests/contract/shared-command-event.contract.spec.ts` (신규)
- `packages/shared-types/src/index.ts`
- `packages/rule-engine/src/application/validate-command.ts` (타입 진입점 연결 시)

핵심 변경 설계:
- 타입 레벨에서 잘못된 조합(예: `DECK_TOP`인데 `cardId` 제공)을 차단하는 케이스 추가
- `Command`/`GameEvent` 유니온이 누락 없이 export되는지 계약 테스트로 고정

## Technical Considerations

- 아키텍처 경계
  - `shared-types`는 기반 레이어이며 상위 레이어 의존 금지 원칙을 유지해야 한다.
  - 근거: `docs/concerns-and-boundaries.md:50`
- 서버 권위/결정론 흐름
  - 클라이언트는 Command만 전송하고 서버가 룰/이벤트를 결정한다는 흐름과 계약이 맞아야 한다.
  - 근거: `ARCHITECTURE.md:20`
- 점진 마이그레이션
  - Step 2에서 `BUY_CARD.payload.fromReserved`는 호환 기간 없이 제거한다.
  - Step 3~4 착수 전에 소비자(rule-engine/game-server) 타입 반영을 같은 배치로 완료한다.

## SpecFlow Analysis

### User Flow Overview
1. 사용자가 토큰 획득 요청
- 입력: `TAKE_TOKENS` + 필요 시 반납 토큰
- 결과: `TOKENS_TAKEN` 이벤트, 플레이어 지갑/은행 토큰 상태 변경

2. 사용자가 카드 예약 요청
- 입력: `RESERVE_CARD` + `target(OPEN_CARD|DECK_TOP)`
- 결과: `CARD_RESERVED` 이벤트, 필요 시 골드 수령, 시장 리필

3. 사용자가 카드 구매 요청
- 입력: `BUY_CARD` + `source(RESERVED|OPEN_MARKET)` + 지불 상세
- 결과: `CARD_BOUGHT` 이벤트, 보너스/점수 반영, 귀족 방문 후보 생성

4. 턴 종료 및 게임 종료
- 입력/내부 트리거: `END_TURN` 또는 점수 조건
- 결과: `TURN_ENDED`/`GAME_ENDED` 이벤트와 종료 메타 기록

### Missing Elements & Gaps
- Critical
  - 덱 탑 예약 시 `cardId` 미지 상태를 어떻게 표현할지(커맨드 입력 vs 이벤트 결과) 합의 필요
  - 토큰 초과 반납 시점(동일 커맨드 내 원자 처리 vs 별도 커맨드) 합의 필요
- Important
  - 종료 메타의 최소 스키마 범위(턴 번호만/라운드 번호 포함) 결정 필요
  - 동점 처리 결과를 `GAME_ENDED.payload`에 어떻게 표현할지 합의 필요
- Nice-to-have
  - `reason` enum에 운영/중단 케이스 확장 여지 정리

### Critical Questions Requiring Clarification
1. 덱 탑 예약 시 클라이언트가 `cardId`를 절대 모르는 모델로 고정할지?
- 결정: `RESERVE_CARD`는 `target.kind="DECK_TOP"`에서 `cardId` 금지

2. 토큰 초과 반납은 `TAKE_TOKENS` payload에 포함해 원자 처리할지?
- 결정: `TAKE_TOKENS`/`RESERVE_CARD` 커맨드 payload에 반납을 포함해 한 커맨드에서 원자 처리

3. `GAME_ENDED`에 동점 해소 근거(예: 카드 수 tie-break)를 포함할지?
- 결정: Step 2에서는 제외, Step 3 정책 설계 시 확정

## Acceptance Criteria

- [x] `packages/shared-types/src/command/reserve-card.command.ts`에 아래 필드가 추가된다.
  - `payload.target: { kind: "OPEN_CARD"; cardId: string; tier: DeckTier } | { kind: "DECK_TOP"; tier: DeckTier }` (필수)
  - `payload.returnedTokens: Partial<Record<TokenColor, number>>` (optional)
  - `payload.takeGoldToken: boolean` (필수, 기존 유지)
- [x] `packages/shared-types/src/command/take-tokens.command.ts`에 아래 필드가 추가된다.
  - `payload.tokens: Partial<Record<GemColor, number>>` (필수, 기존 유지)
  - `payload.returnedTokens: Partial<Record<TokenColor, number>>` (optional)
- [x] `packages/shared-types/src/command/buy-card.command.ts`는 아래와 같이 변경된다.
  - `payload.source: { kind: "OPEN_MARKET"; cardId: string } | { kind: "RESERVED"; cardId: string }` (필수)
  - `payload.fromReserved` 제거 (비허용)
  - `payload.payment: Partial<Record<TokenColor, number>>` (필수, 기존 유지)
- [x] `packages/shared-types/src/event/card-reserved.event.ts`에 아래 필드가 반영된다.
  - `payload.targetKind: "OPEN_CARD" | "DECK_TOP"` (필수)
  - `payload.cardId: string` (필수, 서버가 확정한 카드 ID)
  - `payload.tier: DeckTier` (필수)
  - `payload.grantedGold: boolean` (필수, 기존 유지)
- [x] `packages/shared-types/src/event/turn-ended.event.ts`에 `payload.turnNumber: number` (필수)와 `payload.roundNumber?: number` (optional)가 반영된다.
- [x] `packages/shared-types/src/event/game-ended.event.ts`에 `payload.endTriggeredAtTurn: number` (필수)와 `payload.endTriggeredByPlayerId: string` (필수)가 반영된다.
- [x] 동점 해소 메타는 Step 2 범위에서 추가하지 않고, Step 3 계획/정책 파일에서 확정 대상으로 기록된다.
- [x] `packages/shared-types/src/state/game.state.ts`에 아래 필드가 반영된다.
  - `finalRound: boolean` (필수)
  - `endTriggeredAtTurn?: number` (optional)
  - `endTriggeredByPlayerId?: string` (optional)
- [x] `packages/shared-types/src/index.ts` export가 신규 계약을 누락 없이 노출한다.
- [x] `packages/shared-types/tests/contract/shared-command-event.contract.spec.ts`가 추가되어 계약 회귀를 방지한다.
- [x] `pnpm lint`, `pnpm check-types`, `pnpm test` 통과 기준이 계획에 포함된다.

## Success Metrics

- 계약 타입 변경 후 `packages/shared-types`, `packages/rule-engine`, `apps/game-server` 타입 체크 오류 0건
- `shared-types` 계약 테스트 신규 케이스 최소 6개(예약 출처 2, 반납 2, 종료 메타 2)
- Step 3 착수 시 타입 재수정 없이 정책 파일 구현 시작 가능

## Dependencies & Risks

Dependencies:
- 선행: `DD-0002 Step 1` 카탈로그 ID/티어 규칙 고정 (`docs/design-docs/DD-0002-splendor-rule-implementation-order.md:76`)
- 후속: Step 3 정책 구현, Step 4 상태전이 구현

Risks:
- 타입을 과도하게 확장해 구현 복잡도만 증가할 수 있음
- Step 3에서 필요한 필드가 누락되면 계약 재변경이 발생할 수 있음
- `docs/solutions/` 부재로 과거 장애 패턴 재사용이 불가함

Mitigation:
- Step 2 완료 전에 Step 3 대상 policy 파일 관점으로 필드 필요성 리뷰 1회 수행
- 필수/옵션 필드 구분을 명시하고 optional 남용 제한
- 계약 테스트를 먼저 작성해 변경 안전망 확보

## References & Research

Internal references:
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:98`
- `packages/shared-types/src/command/reserve-card.command.ts:6`
- `packages/shared-types/src/command/take-tokens.command.ts:6`
- `packages/shared-types/src/command/buy-card.command.ts:6`
- `packages/shared-types/src/event/turn-ended.event.ts:4`
- `packages/shared-types/src/event/game-ended.event.ts:9`
- `packages/rule-engine/src/application/validate-command.ts:1`
- `ARCHITECTURE.md:20`
- `docs/concerns-and-boundaries.md:50`

Local research notes:
- 브레인스토밍 문서: 없음 (`docs/brainstorms` 미존재)
- Institutional learnings: 없음 (`docs/solutions` 미존재)
- 외부 리서치: 미실시 (로컬 문서/코드 근거가 충분하고 보안/결제/외부 API 고위험 영역이 아님)
