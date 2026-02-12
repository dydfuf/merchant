---
module: Rule Engine
date: 2026-02-13
problem_type: logic_error
component: service_object
symptoms:
  - "Token overflow가 없는데도 returnedTokens를 넣으면 정책이 통과되어 규칙 외 자발 반납이 가능했다"
  - "providedFinalScores에 플레이어가 누락되어도 winner 계산이 진행되어 잘못된 승자 집합이 나올 수 있었다"
  - "호출자 입력 누락이 명시적 실패 없이 0점 fallback으로 흡수되었다"
root_cause: missing_validation
resolution_type: code_fix
severity: high
tags: [splendor, rule-engine, economy, scoring, validation, game-rules]
---

# Troubleshooting: Splendor Rule Policy Input Validation Gaps

## Problem
스플렌더 도메인 정책에서 입력 정합성 검증이 일부 누락되어, 규칙에 없는 토큰 반납과 부분 점수맵 기반 승자 계산이 침묵적으로 허용됐다. 이 상태는 게임 무결성과 종료 결과 신뢰도를 훼손할 수 있었다.

## Environment
- Module: Rule Engine
- Affected Component: Economy/Scoring policy functions
- Date Solved: 2026-02-13

## Symptoms
- `applyTokenDeltaWithLimit`가 반환 수량 자체만 검증하고, 실제로 "반환이 필요한 상태(>10)인지"는 검증하지 않았다.
- `resolveGameWinners`가 `providedFinalScores`를 그대로 신뢰해 누락 플레이어를 `0`으로 간주할 수 있었다.
- 잘못된 호출 입력이 정책 실패 코드로 드러나지 않아 디버깅 지점이 흐려졌다.

## What Didn't Work

**Attempted Solution 1:** 반환 토큰 유효성(음수 여부, 보유량 초과 여부)만 검증
- **Why it failed:** 규칙의 핵심 조건("초과 시에만 반납")을 검증하지 않아 합법처럼 보이는 불법 입력이 통과했다.

**Attempted Solution 2:** 승자 계산 시 누락 점수를 `?? 0`으로 fallback
- **Why it failed:** 호출자 실수(부분 점수맵)가 조용히 흡수되어 실제 상태와 다른 승자 계산 결과를 만들 수 있었다.

## Solution
입력 정합성 검증을 정책 계층에서 명시적으로 추가하고, 실패 경로를 코드/테스트로 고정했다.

1. Economy 정책에 불필요 반납 차단 추가
- `totalBeforeReturn <= maxTokenCount`인데 `totalReturnedTokens > 0`이면 실패
- 신규 오류 코드: `ECONOMY_UNNECESSARY_TOKEN_RETURN`

2. Scoring 정책에 전달 점수맵 검증 추가
- `state.players`의 모든 키가 `providedFinalScores`에 존재해야 함
- `providedFinalScores`의 알 수 없는 키도 거부
- 신규 오류 코드: `SCORING_FINAL_SCORES_INVALID`

3. 회귀 테스트 추가
- 불필요 반납 거절 케이스
- 누락 플레이어/알 수 없는 플레이어 점수맵 거절 케이스

**Code changes (요약):**
```ts
// packages/rule-engine/src/domain/economy/economy.policy.ts
if (totalBeforeReturn <= maxTokenCount && totalReturnedTokens > 0) {
  return policyFailure("ECONOMY_UNNECESSARY_TOKEN_RETURN");
}
```

```ts
// packages/rule-engine/src/domain/scoring/scoring.policy.ts
for (const playerId of playerIds) {
  if (!Object.hasOwn(providedFinalScores, playerId)) {
    return policyFailure("SCORING_FINAL_SCORES_INVALID");
  }
}
for (const providedPlayerId of Object.keys(providedFinalScores)) {
  if (!playerIdSet.has(providedPlayerId)) {
    return policyFailure("SCORING_FINAL_SCORES_INVALID");
  }
}
```

```ts
// packages/rule-engine/src/domain/policy-error-code.ts
| "ECONOMY_UNNECESSARY_TOKEN_RETURN"
| "SCORING_FINAL_SCORES_INVALID"
```

**Commands run:**
```bash
pnpm lint
pnpm check-types
pnpm test
```

## Why This Works
1. 규칙 위반 입력을 상태 계산 전에 차단해 불법 상태 전이를 원천 차단한다.
2. winner 계산 입력의 완전성과 키 정합성을 강제해 partial map에 의한 침묵 오류를 제거한다.
3. 오류 코드를 분리해 실패 원인을 즉시 식별할 수 있고, 회귀 테스트가 같은 누락을 재발 방지한다.

## Prevention
- 외부에서 제공되는 집계 입력(`providedFinalScores` 같은 파생값)은 항상 키 커버리지/허용 키 검증을 먼저 수행한다.
- 게임 규칙의 조건부 행위(예: "초과 시 반납")는 정책 함수에서 선행 조건으로 명시한다.
- 신규 정책 에러 코드를 추가할 때 반드시 음수(실패) 테스트를 함께 추가한다.
- 리뷰 체크리스트에 "fallback으로 입력 결함을 숨기지 않는가" 항목을 포함한다.

## Related Issues
- Plan: `docs/plans/2026-02-12-feat-splendor-domain-policy-implementation-plan.md`
- Review todos:
  - `todos/005-pending-p1-unnecessary-token-return-allowed.md`
  - `todos/006-pending-p2-final-score-map-not-validated.md`
- Related workflow doc:
  - `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md`
