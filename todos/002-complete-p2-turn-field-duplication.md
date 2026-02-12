---
status: complete
priority: p2
issue_id: "002"
tags: [code-review, quality, contracts, shared-types]
dependencies: []
---

# TURN_ENDED payload field duplication (`turn` vs `turnNumber`)

`TURN_ENDED` 이벤트에 동일 의미로 보이는 `turn`과 `turnNumber`가 동시에 존재해 데이터 불일치 위험이 있다.

## Findings

- `TurnEndedEvent.payload`에 `turn: number`와 `turnNumber: number`가 공존한다.
- 근거: `packages/shared-types/src/event/turn-ended.event.ts:12`
- 현재 타입 수준에서는 두 값이 서로 다른 값을 가져도 컴파일 오류가 발생하지 않는다.
- 이벤트 생산/소비 코드가 추가되면 어떤 필드를 신뢰해야 하는지 기준이 흔들릴 수 있다.

## Proposed Solutions

### Option 1: `turn` 제거, `turnNumber`만 유지

**Approach:** `turn`을 제거하고 `turnNumber`를 단일 정답 필드로 사용한다.

**Pros:**
- 중복 제거
- 계약 단순화

**Cons:**
- 기존 소비 코드가 `turn`에 의존하면 브레이킹

**Effort:** Small

**Risk:** Medium

---

### Option 2: 둘 다 유지하되 one-source rule 문서화

**Approach:** `turnNumber`를 canonical로 정하고 `turn`은 deprecated로 주석/문서화한다.

**Pros:**
- 호환성 유지

**Cons:**
- 임시 중복 유지
- 제거 시점 관리 필요

**Effort:** Small

**Risk:** Medium

## Recommended Action

Option 1을 채택한다. `TURN_ENDED` 계약에서 `payload.turn`을 제거하고 `payload.turnNumber`를 단일 canonical 필드로 유지한다.
관련 계약 테스트도 동일 기준으로 갱신해 중복 의미 필드가 다시 추가되지 않도록 한다.

## Technical Details

**Affected files:**
- `packages/shared-types/src/event/turn-ended.event.ts`
- `packages/shared-types/tests/contract/shared-command-event.contract.spec.ts`

## Resources

- Related plan: `docs/plans/2026-02-12-feat-shared-types-contract-hardening-plan.md`

## Acceptance Criteria

- [x] `TURN_ENDED` 턴 번호 필드의 canonical source가 하나로 정해진다.
- [x] 타입과 테스트가 canonical 규칙을 반영한다.
- [x] 이벤트 생성 코드에서 중복/불일치 가능성이 제거된다.

## Work Log

### 2026-02-12 - Code Review Finding

**By:** Codex

**Actions:**
- shared-types 계약 변경 diff 검토
- `turn`/`turnNumber` 중복 필드 리스크 식별

**Learnings:**
- 타입에 중복 의미 필드가 남으면 향후 이벤트 생산 단계에서 드리프트가 쉽게 발생한다.

### 2026-02-12 - Triage

**By:** Codex

**Actions:**
- 우선순위/영향도 검토 후 `ready` 승인
- 해결 방향을 `turnNumber` 단일 필드로 확정

**Learnings:**
- Step 3 구현 전에 계약 중복을 제거하는 것이 후속 수정 비용을 줄인다.

### 2026-02-13 - Implementation complete

**By:** Codex

**Actions:**
- `packages/shared-types/src/event/turn-ended.event.ts`에서 `payload.turn` 제거
- `packages/shared-types/tests/contract/shared-command-event.contract.spec.ts`에서 `TURN_ENDED` 샘플을 `turnNumber` canonical 모델로 정리

**Learnings:**
- 계약에서 중복 의미 필드를 먼저 제거하면 후속 이벤트 생성 구현이 단순해진다.
