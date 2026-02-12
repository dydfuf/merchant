---
status: completed
priority: p2
issue_id: "006"
tags: [code-review, rule-engine, scoring, reliability]
dependencies: []
---

# Provided Final Score Map Is Not Validated Before Winner Resolution

## Problem Statement

`resolveGameWinners`가 외부에서 전달된 `providedFinalScores`를 그대로 신뢰한다. 이 맵이 플레이어 일부를 누락하면 누락 플레이어가 0점 처리되어 잘못된 승자가 계산될 수 있다.

## Findings

- `providedFinalScores`를 전달하면 `buildFinalScores`를 건너뛰고 그대로 사용한다.
- 근거: `packages/rule-engine/src/domain/scoring/scoring.policy.ts:119`
- 이후 계산에서 누락된 플레이어는 `?? 0`로 처리된다.
- 근거: `packages/rule-engine/src/domain/scoring/scoring.policy.ts:128`
- 이 동작은 호출자 실수(누락/partial map)를 침묵적으로 수용해 종료 이벤트 일관성을 깨뜨릴 수 있다.

## Proposed Solutions

### Option 1: Player coverage 검증 추가 (권장)

**Approach:** `providedFinalScores`가 전달된 경우 `state.players`의 모든 ID가 키로 존재하는지 확인하고, 누락 시 실패 코드 반환.

**Pros:**
- 잘못된 입력 조기 감지
- winner 계산의 신뢰성 확보

**Cons:**
- 실패코드 1개 추가 필요

**Effort:** Small

**Risk:** Low

---

### Option 2: always derive from state

**Approach:** `providedFinalScores` 파라미터를 제거하고 항상 `buildFinalScores(state)`를 사용.

**Pros:**
- 입력 불일치 가능성 원천 제거

**Cons:**
- 호출자에서 사전 계산한 점수 재사용 불가

**Effort:** Medium

**Risk:** Low

## Recommended Action

Option 1 적용 완료: `providedFinalScores` 입력 시 플레이어 키 커버리지를 검증하고, 누락/알 수 없는 키를 실패 처리한다.

## Technical Details

**Affected files:**
- `packages/rule-engine/src/domain/scoring/scoring.policy.ts`
- `packages/rule-engine/src/domain/policy-error-code.ts` (신규 코드 필요 시)
- `packages/rule-engine/tests/rules/scoring.policy.spec.ts`

## Resources

- Plan: `docs/plans/2026-02-12-feat-splendor-domain-policy-implementation-plan.md`

## Acceptance Criteria

- [x] `providedFinalScores`에서 플레이어가 누락되면 실패한다.
- [x] 완전한 점수 맵 입력은 기존처럼 동작한다.
- [x] 누락 점수맵에 대한 회귀 테스트가 추가된다.

## Work Log

### 2026-02-12 - Review Finding Captured

**By:** Codex

**Actions:**
- scoring winner resolution 경로 분석
- partial final score map 허용 여부 확인

**Learnings:**
- 종료 이벤트 생성 전 입력 완전성 검증이 필요

### 2026-02-12 - Fix Applied

**By:** Codex

**Actions:**
- `packages/rule-engine/src/domain/scoring/scoring.policy.ts`에 제공 점수맵 정합성 검증 추가
- `SCORING_FINAL_SCORES_INVALID` 오류 코드 추가
- `packages/rule-engine/tests/rules/scoring.policy.spec.ts`에 누락/알 수 없는 플레이어 케이스 회귀 테스트 추가

**Verification:**
- `pnpm lint`
- `pnpm check-types`
- `pnpm test`
