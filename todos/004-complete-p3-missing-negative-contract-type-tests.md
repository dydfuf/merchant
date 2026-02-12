---
status: complete
priority: p3
issue_id: "004"
tags: [code-review, tests, quality, shared-types]
dependencies: []
---

# Contract tests miss negative type-level assertions

추가된 계약 테스트가 양의 케이스 중심이라, 계획서에서 의도한 "잘못된 조합 차단"(예: DECK_TOP + cardId 금지)을 타입 수준으로 증명하지 못한다.

## Findings

- 테스트는 유효 객체 생성과 값 확인만 수행한다.
- 근거: `packages/shared-types/tests/contract/shared-command-event.contract.spec.ts:11`
- `@ts-expect-error` 기반 음수 타입 테스트가 없어, 금지 조합 회귀를 컴파일 단계에서 감지하지 못한다.

## Proposed Solutions

### Option 1: `tsd` 또는 타입 전용 test 파일 도입

**Approach:** 타입 전용 테스트 도구로 invalid 조합을 명시적으로 실패 검증한다.

**Pros:**
- 타입 계약 회귀 방지 강함

**Cons:**
- 도구/스크립트 추가 필요

**Effort:** Medium

**Risk:** Low

---

### Option 2: 기존 Vitest에 `// @ts-expect-error` 블록 추가

**Approach:** `.ts` 테스트 파일에 음수 케이스를 배치하고 타입체크에서 보장한다.

**Pros:**
- 추가 도구 없이 적용 가능

**Cons:**
- 실행 테스트와 타입 테스트 관심사 혼합

**Effort:** Small

**Risk:** Low

## Recommended Action

Option 2를 채택한다. 기존 테스트 체계를 유지하면서 `@ts-expect-error` 기반 음수 타입 케이스를 계약 테스트에 추가한다.
추가 도구 도입은 보류하고, 필요 시 추후 `tsd` 도입을 재평가한다.

## Technical Details

**Affected files:**
- `packages/shared-types/tests/contract/shared-command-event.contract.spec.ts`
- (선택) `packages/shared-types/package.json` scripts

## Resources

- Plan reference: `docs/plans/2026-02-12-feat-shared-types-contract-hardening-plan.md`

## Acceptance Criteria

- [x] 금지 조합(DECK_TOP + cardId 등)에 대한 음수 타입 테스트가 추가된다.
- [x] 계약 위반 시 CI에서 실패를 감지한다.
- [x] 테스트 문서에 양수/음수 케이스 범위가 명시된다.

## Work Log

### 2026-02-12 - Code Review Finding

**By:** Codex

**Actions:**
- 새 계약 테스트 파일 구조와 검증 범위를 점검

**Learnings:**
- 런타임 테스트만으로는 타입 모델의 금지 조합 회귀를 막기 어렵다.

### 2026-02-12 - Triage

**By:** Codex

**Actions:**
- 개선 효과 대비 비용 검토 후 `ready` 승인
- 단기 실행안으로 `@ts-expect-error` 기반 음수 타입 테스트 확정

**Learnings:**
- 현재 컨텍스트에서는 도구 추가보다 기존 체계 내 음수 타입 검증이 속도/효율 측면에서 유리하다.

### 2026-02-13 - Implementation complete

**By:** Codex

**Actions:**
- `packages/shared-types/tests/contract/shared-command-event.contract.spec.ts`에 `@ts-expect-error` 기반 음수 타입 케이스 3건 추가
- `packages/shared-types/tsconfig.typecheck.json` 추가 (`src`, `tests` 포함)
- `packages/shared-types/package.json`의 `check-types`를 `tsconfig.typecheck.json` 기반으로 변경해 CI에서 음수 타입 케이스 강제

**Learnings:**
- 타입 음수 테스트가 타입체크 입력 집합에 포함되지 않으면 회귀 방지 효과가 없으므로, typecheck 전용 tsconfig 분리가 실용적이다.
