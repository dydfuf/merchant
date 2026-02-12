---
module: Shared Types
date: 2026-02-13
problem_type: workflow_issue
component: development_workflow
symptoms:
  - "Command/Event 계약 변경 시 중복 의미 필드(turn, turnNumber)가 공존해 드리프트 위험이 생김"
  - "필수 필드(finalRound) 추가 후 레거시 스냅샷 호환 정책이 누락될 수 있음"
  - "양수 케이스 테스트만으로는 금지 조합(DECK_TOP+cardId) 회귀를 방지하지 못함"
root_cause: missing_workflow_step
resolution_type: workflow_improvement
severity: medium
tags: [shared-types, contract-evolution, backward-compatibility, type-tests, firestore-mapper]
---

# Troubleshooting: Shared-types 계약 진화 시 드리프트 방지

## Problem
`packages/shared-types` 계약을 확장하는 과정에서 타입은 강화되었지만, 계약 드리프트를 방지하는 운영 규칙(중복 필드 정리, backward-compat 기본값, 음수 타입 테스트 강제)이 함께 고정되지 않으면 후속 단계에서 재작업 위험이 높아졌다.

## Environment
- Module: Shared Types / Infra Firestore
- Affected Component: command/event/state 계약 및 snapshot 매핑
- Date Solved: 2026-02-13

## Symptoms
- `TURN_ENDED` payload에 `turn`과 `turnNumber`가 동시에 존재
- `GameState.finalRound`를 필수로 올렸는데 레거시 snapshot 누락값 처리 정책이 명시되지 않음
- 계약 테스트가 유효 케이스만 다뤄 금지 조합 회귀를 타입체크에서 잡지 못함

## What Didn't Work

**Attempted Solution 1:** 계약 필드만 추가하고 런타임/검증 전략은 후속 단계로 미룸
- **Why it failed:** 후속 구현자 관점에서 canonical 필드와 호환 정책이 불명확해져 다시 의사결정이 필요해짐

**Attempted Solution 2:** Vitest 실행 테스트만으로 계약 안전성 확인
- **Why it failed:** 런타임 테스트는 타입 금지 조합 회귀를 충분히 방어하지 못함

## Solution
다음 3가지를 하나의 변경 배치로 묶어 해결했다.

1. **중복 의미 필드 제거**
- `TURN_ENDED.payload.turn` 제거, `turnNumber`만 canonical로 유지

2. **레거시 호환 기본값 주입**
- Firestore snapshot -> `GameState` 매핑에서 `finalRound` 누락 시 `false` 주입

3. **음수 타입 테스트 강제**
- `@ts-expect-error` 케이스 추가
- `shared-types`의 `check-types`를 `tsconfig.typecheck.json` 기반으로 변경해 `tests`까지 타입체크 대상에 포함

**Code changes (요약):**
```ts
// packages/shared-types/src/event/turn-ended.event.ts
payload: {
  previousPlayerId: string;
  nextPlayerId: string;
  turnNumber: number;
  roundNumber?: number;
}
```

```ts
// packages/infra-firestore/src/mappers/game.mapper.ts
export function mapSnapshotToGameState(snapshot: GameStateSnapshotInput): GameState {
  return {
    ...snapshot,
    finalRound: snapshot.finalRound ?? false,
  };
}
```

```json
// packages/shared-types/package.json
"check-types": "tsc --noEmit -p tsconfig.typecheck.json"
```

**Commands run:**
```bash
pnpm lint
pnpm check-types
pnpm test
```

## Why This Works
1. **Canonical field 단일화**로 이벤트 생산/소비 경로의 해석 분기를 제거했다.
2. **Read-time default 주입**으로 타입 엄격성(`finalRound` 필수)과 레거시 데이터 호환성을 동시에 확보했다.
3. **음수 타입 테스트 + 타입체크 대상 확장**으로 “금지 조합이 다시 들어오는 회귀”를 CI에서 즉시 검출할 수 있게 했다.

## Prevention
- 계약 변경 PR에는 아래 3항목을 항상 함께 점검한다.
  - Canonical field가 하나인지(중복 의미 필드 금지)
  - 신규 필수 필드의 레거시 read 정책이 있는지
  - 음수 타입 테스트가 실제 typecheck 입력(`tests` 포함)에 들어가는지
- `shared-types` 변경 시 `pnpm check-types`가 `tsconfig.typecheck.json`을 사용하도록 유지한다.
- `docs/plans/*`와 `todos/*`에 의사결정 근거를 남겨 후속 단계(Step 3+)에서 재해석 비용을 줄인다.

## Related Issues
- Plan: `docs/plans/2026-02-12-feat-shared-types-contract-hardening-plan.md`
- Work logs:
  - `todos/001-complete-p1-shared-types-contract-hardening.md`
  - `todos/002-complete-p2-turn-field-duplication.md`
  - `todos/003-complete-p2-game-state-final-round-backward-compat.md`
  - `todos/004-complete-p3-missing-negative-contract-type-tests.md`
