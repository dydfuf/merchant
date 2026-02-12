---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, architecture, contracts, shared-types]
dependencies: []
---

# `GameState.finalRound` required field backward-compat risk

`GameState`에 `finalRound: boolean`을 필수로 추가했지만, 기존 스냅샷/초기 상태 생성 경로와의 호환 전략이 명시되지 않았다.

## Findings

- `GameState`에 `finalRound: boolean`이 필수 필드로 추가되었다.
- 근거: `packages/shared-types/src/state/game.state.ts:15`
- 현재 변경은 타입 관점에서만 반영되어, 실제 저장소 스냅샷(이전 문서)에 필드가 없을 때의 기본값 정책이 보이지 않는다.
- 서버/인프라에서 runtime 역직렬화 시 `undefined`를 허용하지 않는 로직이 생기면 런타임 결함으로 이어질 수 있다.

## Proposed Solutions

### Option 1: 필수 유지 + 역직렬화 기본값 강제

**Approach:** 저장소 read 경로에서 `finalRound` 누락 시 `false`를 주입한다.

**Pros:**
- 타입 안정성 유지
- 의도 명확

**Cons:**
- 모든 read 경로 확인 필요

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Step 3 전까지 optional 전환

**Approach:** `finalRound?: boolean`로 두고, 정책/상태전이 구현 시점에 필수화한다.

**Pros:**
- 하위 호환 용이

**Cons:**
- 타입 엄격도 저하

**Effort:** Small

**Risk:** Low

## Recommended Action

Option 1을 채택한다. `finalRound`는 필수로 유지하고, 스냅샷 read 경로에서 필드 누락 시 `false`를 주입하는 하위 호환 정책을 적용한다.
game-server/infra-firestore의 역직렬화 경로에 동일 정책을 반영하고 legacy snapshot 회귀 테스트를 추가한다.

## Technical Details

**Affected files:**
- `packages/shared-types/src/state/game.state.ts`
- (후속) `apps/game-server` 스냅샷 직렬화/역직렬화 경로
- (후속) `packages/infra-firestore` 어댑터

## Resources

- Architecture reference: `ARCHITECTURE.md`
- Plan reference: `docs/plans/2026-02-12-feat-shared-types-contract-hardening-plan.md`

## Acceptance Criteria

- [x] `finalRound` 누락 스냅샷에 대한 처리 정책이 명시된다.
- [x] 선택한 정책(기본값 주입 또는 optional 유지)이 타입과 구현에 반영된다.
- [x] 회귀 테스트로 legacy snapshot 입력이 검증된다.

## Work Log

### 2026-02-12 - Code Review Finding

**By:** Codex

**Actions:**
- `GameState` 필드 변경과 아키텍처 문맥(이벤트+스냅샷) 교차 점검

**Learnings:**
- 계약 필수 필드 추가 시 저장소 레벨 backward-compat 정책이 함께 있어야 안전하다.

### 2026-02-12 - Triage

**By:** Codex

**Actions:**
- 우선순위/런타임 영향 검토 후 `ready` 승인
- `finalRound` 필수 유지 + read-time default 주입 전략 확정

**Learnings:**
- 타입 엄격성을 유지하면서도 read 경로 default를 두면 호환성과 안전성을 함께 확보할 수 있다.

### 2026-02-13 - Implementation complete

**By:** Codex

**Actions:**
- `packages/infra-firestore/src/mappers/game.mapper.ts`에 `mapSnapshotToGameState` 추가
- `finalRound` 누락 시 `false`를 주입하는 read-time default 정책 구현
- `packages/infra-firestore/tests/mappers/game.mapper.spec.ts`에서 legacy/current snapshot 회귀 테스트 3건 추가

**Learnings:**
- 레거시 스냅샷 호환 정책을 매퍼에 고정하면 도메인 타입 엄격성을 유지하면서 런타임 리스크를 줄일 수 있다.
