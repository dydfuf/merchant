---
status: completed
priority: p1
issue_id: "005"
tags: [code-review, rule-engine, economy, game-rules]
dependencies: []
---

# Unnecessary Token Return Is Allowed In Economy Policy

## Problem Statement

`TAKE_TOKENS`/`RESERVE_CARD` 처리에서 "10개 초과 시 반납" 규칙을 강제해야 하지만, 현재 정책은 초과 여부와 무관하게 임의 반납을 허용한다. 이로 인해 플레이어가 규칙에 없는 자발적 토큰 폐기를 실행할 수 있다.

## Findings

- `applyTokenDeltaWithLimit`는 `returnedTokens` 유효성(보유량 초과 여부)만 확인하고, 실제로 반납이 필요한 상황인지 확인하지 않는다.
- 근거: `packages/rule-engine/src/domain/economy/economy.policy.ts:73`
- 현재 로직은 `(현재 토큰 + 획득 토큰) <= 10`인 경우에도 `returnedTokens`를 허용한다.
- 근거: `packages/rule-engine/src/domain/economy/economy.policy.ts:115`
- 설계 문서에서는 반납 모델이 "토큰 10개 초과 시" 케이스로 정의되어 있다.
- 근거: `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:109`

## Proposed Solutions

### Option 1: 반납 필요 조건 강제 (권장)

**Approach:** `applyTokenDeltaWithLimit`에서 `totalBeforeReturn = current + gained`를 계산한 뒤, `totalBeforeReturn <= max`인데 `returnedTokens` 총합이 0보다 크면 실패 처리한다.

**Pros:**
- 게임 규칙과 정책 구현 일치
- 불법 명령을 조기에 차단

**Cons:**
- 실패코드 1개 추가 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: Command 레벨에서 반납 필드 금지/허용 분기

**Approach:** 타입 또는 command validation 단계에서 반납 허용 조건을 먼저 제한한다.

**Pros:**
- 정책 호출 전 빠른 거절

**Cons:**
- 도메인 규칙이 타입/검증층으로 분산

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Option 1 적용 완료: `totalBeforeReturn <= maxTokenCount` 인 경우 비영(>0) `returnedTokens`를 정책 단계에서 거부한다.

## Technical Details

**Affected files:**
- `packages/rule-engine/src/domain/economy/economy.policy.ts`
- `packages/rule-engine/src/domain/policy-error-code.ts`
- `packages/rule-engine/tests/rules/economy.policy.spec.ts`

## Resources

- Plan: `docs/plans/2026-02-12-feat-splendor-domain-policy-implementation-plan.md`

## Acceptance Criteria

- [x] `totalBeforeReturn <= 10`일 때 `returnedTokens`가 있으면 정책이 실패한다.
- [x] 반납이 필요한 케이스(`totalBeforeReturn > 10`)는 기존처럼 허용된다.
- [x] 신규 실패 경로에 대한 단위 테스트가 추가된다.

## Work Log

### 2026-02-12 - Review Finding Captured

**By:** Codex

**Actions:**
- 도메인 정책 구현 diff 검토
- 반납 조건 검증 누락 확인

**Learnings:**
- 규칙 위반은 게임 무결성에 직접 영향이 있어 Step 4 전에 차단 필요

### 2026-02-12 - Fix Applied

**By:** Codex

**Actions:**
- `packages/rule-engine/src/domain/economy/economy.policy.ts`에 불필요 반납 사전 검증 추가
- `ECONOMY_UNNECESSARY_TOKEN_RETURN` 오류 코드 추가
- `packages/rule-engine/tests/rules/economy.policy.spec.ts`에 회귀 테스트 추가

**Verification:**
- `pnpm lint`
- `pnpm check-types`
- `pnpm test`
