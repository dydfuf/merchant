---
title: "feat: game-server 오케스트레이션 연결 (DD-0002 Step 6)"
type: feat
date: 2026-02-12
---

# ✨ feat: game-server 오케스트레이션 연결 (DD-0002 Step 6)

## Enhancement Summary

**Deepened on:** 2026-02-12  
**Sections enhanced:** 12  
**Research inputs:** local skills + institutional learnings + official docs (TypeScript, Vitest, Firestore, Stripe)

### Key Improvements

1. Step 6의 결정 잠금(duplicate 처리 방식, deterministic context 소스, 트랜잭션 경계)을 명시해 구현 중 재해석 지점을 줄였다.
2. `idempotency -> version -> applyCommand -> persist` 흐름에 대해 실패 코드 분류, 재시도 가능성, 관측 지표를 함께 고정했다.
3. `GAME_SERVER` 레이어 픽스처(idempotency/version conflict)를 실제 서비스 테스트에 연결하는 검증 경로를 구체화했다.

### New Considerations Discovered

- Firestore 트랜잭션은 컨텐션 시 자동 재시도를 수행하므로, 커맨드 핸들러는 `ABORTED` 계열을 retryable로 분류해야 한다.
- Stripe idempotency 모델처럼 동일 키 재시도 시 동일 결과 반환 정책을 명시하면 클라이언트 재시도 UX가 단순해진다.
- Vitest 동시성 테스트(`test.concurrent`) 사용 시 assertion 문맥 관리와 타이머 제어를 명확히 하지 않으면 flaky 테스트가 증가할 수 있다.

## Section Manifest

Section 1: Context & Scope - Step 6 책임 경계와 목표 고정  
Section 2: Research Synthesis - 로컬/외부 근거 및 스킬 관점 통합  
Section 3: SpecFlow - 정상/실패/재시도 흐름 정밀화  
Section 4: Proposed Solution A - 애플리케이션 계약/결과 타입 강화  
Section 5: Proposed Solution B - dispatcher/service 분리와 경계 강제  
Section 6: Proposed Solution C - 트랜잭션/지속화 경계와 원자성 보장  
Section 7: Proposed Solution D - 픽스처 소비 테스트 전략 심화  
Section 8: Decision Locks - 구현 전 필수 결정 사항 고정  
Section 9: Implementation Phases - 단계별 deliverable/게이트 구체화  
Section 10: Acceptance/Success - 측정 가능한 완료 기준 강화  
Section 11: Risks & Mitigation - 운영/무결성 리스크 대응 보강  
Section 12: Validation & References - 검증 명령/근거 링크 명시

## Overview

`DD-0002`의 Step 6(`game-server` 오케스트레이션 연결)을 독립 실행 가능한 계획으로 고정한다. 목표는 `apps/game-server`가 커맨드 처리 파이프라인을 완성해 `idempotency -> version check -> rule-engine -> infra persist` 순서를 강제하고, 룰 판단은 `@repo/rule-engine`의 `applyCommand`에만 위임하는 것이다.

핵심 산출물은 아래 3가지다.

- 애플리케이션 서비스/포트 계약 (`game-command.service`, `command-handler.port`)
- 프레젠테이션 진입점과 오케스트레이션 연결 (`game.gateway`, `command-dispatcher`)
- `GAME_SERVER` 시나리오 픽스처를 소비하는 회귀 테스트

## Idea Refinement Notes

- 브레인스토밍 확인 결과: `docs/brainstorms/2026-02-12-solo-bot-hybrid-brainstorm.md` 1건만 존재하며 본 요청(DD-0002 Step 6)과 주제가 달라 미적용.
- 사용자 입력이 `DD-0002` Step 6을 명시하고 있어 추가 정제 질문 없이 계획 단계로 진행.

## Research Decision

- 기본 근거는 레포 내부 문서/코드/학습 문서로 구성한다.
- 다만 Step 6의 정확도를 높이기 위해 다음 외부 1차 소스를 제한적으로 추가했다.
  - TypeScript: 분기 소진 검사(`never`) 패턴
  - Vitest: 동시성/비동기 테스트 안정화 패턴
  - Firestore: 트랜잭션 원자성/자동 재시도/컨텐션 동작
  - Stripe: idempotency key 운영 관례

## Research Findings (Local)

1. Step 6 대상 파일은 대부분 스캐폴딩 상태다.
- `apps/game-server/src/application/services/game-command.service.ts`
- `apps/game-server/src/application/commands/command-dispatcher.service.ts`
- `apps/game-server/src/application/commands/command-handler.port.ts`
- `apps/game-server/src/presentation/ws/game.gateway.ts`

2. `rule-engine` 상태전이 계약은 Step 6이 소비 가능한 상태다.
- `ApplyCommandInput`/`ApplyCommandResult`: `packages/rule-engine/src/application/apply-command.ts:51`
- 실패코드/정책코드 매핑: `packages/rule-engine/src/application/apply-command.ts:58`
- export 완료: `packages/rule-engine/src/index.ts:2`

3. `shared-types` 계약은 서버 오케스트레이션 입력/출력에 필요한 shape를 제공한다.
- 커맨드 유니온: `packages/shared-types/src/command/command.type.ts:6`
- 상태/종료 메타: `packages/shared-types/src/state/game.state.ts:8`
- 턴/종료 이벤트 canonical 필드: `packages/shared-types/src/event/turn-ended.event.ts:4`, `packages/shared-types/src/event/game-ended.event.ts:9`

4. 서버 레이어 시나리오 픽스처가 이미 준비돼 있다.
- `packages/test-fixtures/src/scenarios/two-player/idempotency.fixture.ts:7`
- `packages/test-fixtures/src/scenarios/two-player/version-conflict.fixture.ts:5`
- 둘 다 `layer: "GAME_SERVER"`로 명시됨.

5. 현재 `game-server` 테스트는 멱등성 정책 함수 단일 테스트만 존재한다.
- `apps/game-server/tests/application/game-command.service.spec.ts:5`

6. TypeScript strict 환경이 이미 켜져 있어 discriminated union 기반 결과 타입 설계가 적합하다.
- `strict: true`: `packages/typescript-config/base.json:16`
- `noUncheckedIndexedAccess: true`: `packages/typescript-config/base.json:13`

## Research Findings (External + Skill Synthesis)

### Architecture Strategist 관점

- 오케스트레이션 서비스는 순서 제어와 경계 강제에 집중하고, 룰 판단/상태전이는 `applyCommand`에 완전 위임해야 한다.
- 경계 유지 핵심은 "port 먼저, adapter 주입은 bootstrap"이다.

### Security Sentinel 관점

- 입력 검증 책임은 2단으로 유지한다.
  - 1차: `game-server`에서 인증/참여자/버전/멱등
  - 2차: `rule-engine`에서 envelope + policy
- 오류 응답은 내부 상태를 과도 노출하지 않되, 클라이언트 재시도 판단이 가능한 코드는 제공해야 한다.

### Performance Oracle 관점

- duplicate key/버전 충돌은 rule-engine 호출 전에 차단해 비용을 줄인다.
- 트랜잭션 경로는 읽기 범위를 최소화하고 문서 접근 수를 고정해 컨텐션 비용을 제어한다.

### Pattern Recognition + Kieran TypeScript 관점

- 서비스 결과 타입은 분기 가능한 discriminated union으로 고정하고, `assertNever` 패턴으로 누락 분기를 컴파일 시점에 차단한다.
- `any` 없이 도메인 타입(`Command`, `GameState`, `ApplyCommandResult`)을 직접 연결한다.

### Code Simplicity 관점

- Step 6 단계에서는 과도한 프레임워크 추상화보다 단일 서비스 파이프라인을 명확하게 구현하는 편이 유지보수성이 높다.
- 재사용 가능성이 검증되지 않은 공통 유틸 확장은 보류한다.

### Data Integrity Guardian 관점

- 이벤트 append + 스냅샷 update + command log write는 반드시 단일 원자 연산으로 처리해야 한다.
- Firestore 트랜잭션 컨텐션 재시도 동작을 고려해 재시도 가능한 에러 분류를 별도로 유지해야 한다.

### Official Docs Highlights

- TypeScript는 `switch + never`로 유니온 분기 소진 검사를 권장한다.
- Vitest는 fake timers/async timers/`expect.assertions` 조합으로 비동기 테스트 안정성을 높일 수 있다.
- Firestore는 트랜잭션에서 read-then-write 순서를 요구하며 컨텐션 시 자동 재시도를 수행한다.
- Stripe는 idempotency key 기준으로 최초 결과(status/body)를 보존해 재시도에 동일 결과를 반환하는 모델을 제시한다.

## Institutional Learnings Applied

### 1) 입력 결함을 fallback으로 숨기지 않는다

- 근거: `docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md`
- 적용: Step 6에서도 정책 실패를 generic success/fallback으로 변환하지 않고 `rejected_policy + policyCode`로 유지한다.

### 2) 계약 드리프트 방지를 위해 canonical 필드/호환 정책을 고정한다

- 근거: `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md`
- 적용: `game-server`는 `shared-types` canonical 필드만 사용하고, 레거시 필드 병행 해석을 도입하지 않는다.

## Problem Statement / Motivation

Step 4(`apply-command`)와 Step 5(테스트/픽스처)는 준비됐지만, Step 6이 비어 있어 실제 서버 커맨드 경로가 부재하다. 현재 상태에서는 다음 문제가 지속된다.

- 멱등성/버전 충돌을 실제 애플리케이션 경계에서 검증할 수 없다.
- 룰엔진 성공 결과(`events`, `nextState`)를 이벤트 로그/스냅샷 저장으로 연결할 수 없다.
- `GAME_SERVER` 레이어 픽스처가 존재해도 실행 주체가 없어 회귀 방어가 약하다.

## SpecFlow Analysis

### User Flow Overview

1. `apps/game-server/src/presentation/ws/game.gateway.ts`가 인증된 커맨드를 수신해 dispatcher로 전달한다.
2. dispatcher가 command type/DTO를 표준 `Command` 객체로 정규화해 `game-command.service`에 위임한다.
3. 서비스가 idempotency를 먼저 평가하고 duplicate면 기존 결과를 재응답한다.
4. 신규 key인 경우 version check를 수행하고 충돌이면 즉시 거절한다.
5. 통과 시 `applyCommand` 호출로 `events`/`nextState`를 계산한다.
6. 성공이면 command log + events + snapshot을 트랜잭션으로 원자 저장한다.
7. 결과를 gateway로 반환해 ACK/에러를 표준 이벤트로 응답한다.

### Flow Permutations Matrix

| 축 | 경우 | 기대 동작 |
| --- | --- | --- |
| idempotency | 키 없음 | `rejected` (`MISSING_IDEMPOTENCY_KEY`) |
| idempotency | 키 중복, 동일 payload | `replayed` (기존 결과 재응답) |
| idempotency | 키 중복, payload 불일치 | `rejected` (`IDEMPOTENCY_PAYLOAD_MISMATCH`) |
| version | `expectedVersion !== state.version` | rule-engine 미호출, `VERSION_CONFLICT` |
| rule-engine | `POLICY_VIOLATION` | `policyCode` 보존 후 거절 |
| persist | 트랜잭션 `ABORTED/UNAVAILABLE` | retryable 인프라 실패로 분류 |
| command type | 4개 Phase 1 커맨드 | 동일 파이프라인 강제 |

### Missing Elements & Gaps

- **Idempotency Persistence**
- 중복 key 판단을 위해 command 처리 이력 조회 모델이 필요하지만 포트가 아직 정의되지 않았다.

- **Deterministic Context Sourcing**
- `playerOrder`, `deckCardIdsByTier`를 어느 저장 모델에서 읽을지 불명확하다.

- **Error Taxonomy**
- 클라이언트 재시도 가능 여부를 표현하는 오류 분류 체계가 아직 없다.

- **Observability**
- duplicate율, version conflict율, policy reject율을 측정할 이벤트/로그 스키마가 없다.

### Critical Questions Requiring Clarification

1. **Critical**
- 질문: duplicate key는 기존 결과 재응답으로 고정할지?
- 기본 가정: 재응답으로 고정한다.

2. **Important**
- 질문: idempotency key 보존 기간(TTL)을 얼마로 둘지?
- 기본 가정: 24시간 이상 보존 후 정리한다.

3. **Important**
- 질문: `playerOrder`/`deck context`를 snapshot에 저장할지 별도 설정 문서로 분리할지?
- 기본 가정: snapshot에서 단일 조회 가능하도록 canonical 필드로 유지한다.

## Decision Locks (Step 6 착수 전 고정)

- Lock 1: duplicate idempotency key는 기존 결과 재응답으로 처리한다.
- Lock 2: rule-engine 실패는 `policyCode`를 보존해 application 결과로 반환한다.
- Lock 3: persistence는 command log + events + snapshot 단일 원자 연산으로 처리한다.
- Lock 4: `applyCommand` 입력 컨텍스트(`playerOrder`, `deckCardIdsByTier`)는 단일 source로 읽는다.
- Lock 5: application 레이어는 infra 구현 import 금지, bootstrap 주입만 허용한다.

## Proposed Solution

### A. Application Contract First

대상 파일:
- `apps/game-server/src/application/commands/command-handler.port.ts`
- `apps/game-server/src/application/services/game-command.service.ts`
- `apps/game-server/src/application/policies/version-conflict.policy.ts`

핵심은 `game-command.service` 결과 타입을 분기 가능한 union으로 고정하는 것이다.

```ts
// planned shape
type GameCommandServiceResult =
  | {
      kind: "accepted";
      events: GameEvent[];
      nextState: GameState;
      replayed: false;
    }
  | {
      kind: "replayed";
      events: GameEvent[];
      nextState: GameState;
      replayed: true;
    }
  | {
      kind: "rejected";
      reason:
        | "MISSING_IDEMPOTENCY_KEY"
        | "IDEMPOTENCY_PAYLOAD_MISMATCH"
        | "VERSION_CONFLICT"
        | "POLICY_VIOLATION"
        | "INFRA_FAILURE";
      retryable: boolean;
      policyCode?: PolicyErrorCode;
    };
```

#### Research Insights

**Best Practices**
- 결과 타입은 문자열 enum 대신 discriminated union으로 설계해 분기 누락을 컴파일 타임에 차단한다.
- `assertNever`로 서비스 응답 매핑 스위치의 소진 검사를 강제한다.

**Performance Considerations**
- `reject_missing`, `reject_duplicate`, `version_conflict` 경로는 `applyCommand` 호출 전 조기 종료한다.

**Edge Cases**
- 동일 key 다른 payload 재전송
- replay 대상 결과가 손상/누락된 상태
- actor가 게임 참가자에서 이탈된 상태

**References**
- [TypeScript Narrowing (Discriminated Unions)](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [TypeScript Exhaustiveness Checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)

### B. Dispatcher/Service Split

대상 파일:
- `apps/game-server/src/application/commands/command-dispatcher.service.ts`
- `apps/game-server/src/application/services/game-command.service.ts`
- `apps/game-server/src/presentation/ws/game.gateway.ts`

dispatcher는 transport 독립 변환 계층으로, service는 오케스트레이션 계층으로 고정한다.

#### Research Insights

**Best Practices**
- gateway는 인증/DTO 파싱 후 dispatcher만 호출하고, 룰/저장소 로직을 포함하지 않는다.
- service는 순서(`idempotency -> version -> rule-engine -> persist`)를 한 메서드 안에서 명시적으로 보여줘야 한다.

**Implementation Details**

```ts
// planned sequence
const idempotencyDecision = evaluateIdempotencyKey(seenKeys, command.idempotencyKey);
if (idempotencyDecision !== "accept") return mapIdempotencyDecision(idempotencyDecision);

if (isVersionConflict(command.expectedVersion, snapshot.version)) {
  return rejectVersionConflict(snapshot.version);
}

const engineResult = applyCommand({ state: snapshot, command, playerOrder, deckCardIdsByTier });
if (!engineResult.ok) return rejectByEngine(engineResult);

await ports.persistCommandResult({ command, events: engineResult.events, nextState: engineResult.nextState });
return accept(engineResult);
```

**Edge Cases**
- command type 미지원
- gateway 재연결 직후 중복 submit
- service retry 중 동일 커맨드 중복 진입

**References**
- [Vitest Mocking](https://vitest.dev/guide/mocking.html)

### C. Persistence Boundary Through Ports

대상 파일:
- `apps/game-server/src/application/commands/command-handler.port.ts`
- `apps/game-server/src/bootstrap/app.bootstrap.ts`
- `packages/infra-firestore/src/repositories/*.ts` (후속 연결)

application은 port만 알고, Firestore adapter는 bootstrap에서 주입한다.

#### Research Insights

**Best Practices**
- 트랜잭션 내부에서 필요한 읽기를 먼저 수행하고, 이후 쓰기를 수행한다.
- 컨텐션 재시도(`ABORTED`)를 retryable 실패로 분리한다.
- idempotency 조회/저장은 트랜잭션 경계에 함께 둬야 split-brain을 줄일 수 있다.

**Implementation Details**

```ts
// planned persistence contract
await firestore.runTransaction(async (tx) => {
  const gameSnapshot = await tx.get(gameRef);
  const existing = await tx.get(commandRef);
  // ... evaluate duplicate + version
  tx.set(commandRef, commandLogDoc);
  for (const event of events) tx.set(eventRef(event.version), event);
  tx.set(gameRef, nextStateDoc, { merge: false });
}, { maxAttempts: 5 });
```

**Edge Cases**
- 트랜잭션 재시도 중 commandRef가 선행 생성됨
- event version hole 발생 가능성
- snapshot write 성공/command log 실패 같은 부분 반영

**References**
- [Firestore Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firestore Data Contention in Transactions](https://firebase.google.com/docs/firestore/transaction-data-contention)
- [Firestore Node.js Transaction API (`runTransaction`)](https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore.html#runtransactionupdatefunction-transactionoptions)

### D. GAME_SERVER Fixture Consumption

대상 파일:
- `apps/game-server/tests/application/game-command.service.spec.ts`
- `apps/game-server/tests/application/command-dispatcher.service.spec.ts` (신규)
- `packages/test-fixtures/src/scenarios/two-player/idempotency.fixture.ts`
- `packages/test-fixtures/src/scenarios/two-player/version-conflict.fixture.ts`

#### Research Insights

**Best Practices**
- fixture 주도 테스트에서 각 케이스의 `expectedFocus`를 테스트명/설명과 1:1로 맞춘다.
- 비동기 핸들러 테스트는 `expect.assertions`로 assertion 누락을 방지한다.
- 타이머/재시도 테스트는 `vi.useFakeTimers()`와 `advanceTimersByTimeAsync`를 사용한다.

**Implementation Details**

```ts
it("중복 idempotency 키는 기존 결과를 재응답한다", async () => {
  expect.assertions(3);
  const scenario = idempotencyFixture;
  const result = await runScenarioThroughGameServer(scenario);
  expect(result.kind).toBe("replayed");
  expect(result.replayed).toBe(true);
  expect(result.events.length).toBeGreaterThan(0);
});
```

**Edge Cases**
- fixture의 command sequence가 빈 배열인 경우
- fixture initialState와 command.gameId 불일치
- version conflict 시나리오가 잘못 accepted 되는 회귀

**References**
- [Vitest `expect.assertions`](https://vitest.dev/api/expect.html#expect-assertions)
- [Vitest Fake Timers](https://vitest.dev/guide/mocking.html#timers)

### E. Observability and Runtime Guardrails

대상 파일:
- `apps/game-server/src/infrastructure/logger/logger.ts`
- `apps/game-server/src/application/services/game-command.service.ts`

필수 로그/메트릭:
- `command.accepted.count`
- `command.replayed.count`
- `command.rejected.version_conflict.count`
- `command.rejected.policy.count`
- `command.failed.infra.count`
- `command.latency.ms` (p50/p95)

실패율이 급상승할 때 즉시 구간(멱등/버전/룰/인프라)을 좁힐 수 있도록 reason 코드를 태깅한다.

## Implementation Phases

### Phase 1: 계약/응답 모델 고정

- [x] `apps/game-server/src/application/commands/command-handler.port.ts`에 저장소/트랜잭션 포트 인터페이스 정의
- [x] `apps/game-server/src/application/policies/version-conflict.policy.ts` 구현
- [x] `apps/game-server/src/application/services/game-command.service.ts` 결과 union 타입/에러 taxonomy 정의

**Gate**
- 타입 체크 통과
- result union 분기 `assertNever` 경고 0건

### Phase 2: 오케스트레이션 본체 구현

- [x] `game-command.service` 순서 강제 파이프라인 구현
- [x] `command-dispatcher.service` 진입점 표준화
- [x] `applyCommand` 실패코드 매핑(`policyCode` 보존) 구현

**Gate**
- `idempotency/version/policy` 단위 테스트 통과
- `@repo/infra-firestore` 직접 import 0건

### Phase 3: 인프라 주입/프레젠테이션 연결

- [x] `app.bootstrap.ts`에서 포트 구현체 주입 연결
- [x] `game.gateway.ts` command 수신 -> dispatcher 호출 연결
- [x] `index.ts` bootstrap 진입점 연결

**Gate**
- smoke 수준 통합 테스트 통과
- 에러 응답 reason mapping 확인

### Phase 4: 테스트/회귀 게이트 완성

- [x] `game-command.service.spec.ts`를 통합 시나리오 중심으로 확장
- [x] `command-dispatcher.service.spec.ts` 신규 추가
- [x] `idempotencyFixture`, `versionConflictFixture` 실제 소비 테스트 추가
- [x] retry/timer 경로 테스트(필요 시 fake timers) 추가 (`retryable` 분류 경로 검증으로 대체)

**Gate**
- `pnpm --filter game-server test` 통과
- flaky 테스트 0건(동일 리런 3회 기준)

## Out of Scope

- 매칭/관전/리플레이/랭킹 기능
- WebSocket 전송 최적화(배치/압축/세션 샤딩)
- Firestore 운영 최적화(샤딩/아카이빙/TTL 자동화 구현 세부)

## Technical Considerations

- 경계 규칙 준수:
  - `presentation -> application -> domain -> types`: `docs/concerns-and-boundaries.md:53`
  - `application`의 infra 직접 import 금지: `docs/concerns-and-boundaries.md:106`
  - `apps/game-server` lint 규칙: `apps/game-server/eslint.config.js:56`
- 서버 권위 처리 순서:
  - Command 처리 시퀀스: `ARCHITECTURE.md:129`
  - Step 6 목표 순서: `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:164`
- 실패 투명성:
  - 정책 실패를 fallback으로 숨기지 않는다: `docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md`

## Acceptance Criteria

- [x] `apps/game-server/src/application/services/game-command.service.ts`가 `idempotency -> version -> applyCommand -> persist` 순서를 코드로 강제한다.
- [x] duplicate key가 동일 결과 재응답(`kind: replayed`)으로 처리된다.
- [x] `apps/game-server/src/application/policies/version-conflict.policy.ts`에 충돌 판정 로직이 구현된다.
- [x] `applyCommand` 실패는 `POLICY_VIOLATION`일 때 `policyCode`를 보존한다.
- [x] `apps/game-server/src/application/commands/command-handler.port.ts`에 persistence 포트가 정의된다.
- [x] application 계층에서 `@repo/infra-firestore` 직접 import가 없다.
- [x] `apps/game-server/tests/application/game-command.service.spec.ts`에 한글 테스트명 기준의 성공/중복/충돌/정책실패 케이스가 포함된다.
- [x] `apps/game-server/tests/application/command-dispatcher.service.spec.ts`가 추가된다.
- [x] `idempotencyFixture`/`versionConflictFixture`가 game-server 테스트에서 실제 소비된다.
- [x] 트랜잭션 실패가 retryable/non-retryable로 구분된다.

## Success Metrics

- GAME_SERVER 시나리오 2종(idempotency/version conflict) 테스트 통과
- `apps/game-server` lint/typecheck/test 통과
- 루트 검증(`pnpm lint`, `pnpm check-types`, `pnpm test`) 통과
- 오케스트레이션 경로 경계 위반(`no-restricted-imports`) 0건
- command 처리 지연 p95 250ms 이하(로컬/테스트 환경 기준 측정값 기록)

## Dependencies & Risks

### Dependencies

- Step 4 `applyCommand` 안정 계약 유지: `packages/rule-engine/src/application/apply-command.ts:51`
- shared-types command/event/state 계약 유지
- persistence adapter(또는 test fake) 준비

### Risks

- Risk: duplicate key 의미론 미고정
- Mitigation: Decision Lock 1 고정 + fixture 기반 회귀 테스트

- Risk: deterministic context 공급원 분기
- Mitigation: snapshot canonical source 고정 + mismatch 테스트 추가

- Risk: transaction contention 반복으로 지연 급증
- Mitigation: retryable 오류 분리, 재시도 횟수/지연 메트릭 수집

- Risk: application 레이어 infra 의존 역류
- Mitigation: port-first 설계와 ESLint 경계 규칙으로 차단

- Risk: 테스트 flaky
- Mitigation: fake timers, assertion count, 시나리오 데이터 고정

## Validation Plan

필수 검증:

```bash
pnpm lint
pnpm check-types
pnpm test
```

집중 검증:

```bash
pnpm --filter game-server check-types
pnpm --filter game-server test
pnpm --filter game-server test -- --runInBand
```

## References

### Internal

- `ARCHITECTURE.md:129`
- `docs/concerns-and-boundaries.md:53`
- `docs/concerns-and-boundaries.md:106`
- `docs/design-docs/DD-0002-splendor-rule-implementation-order.md:155`
- `apps/game-server/eslint.config.js:56`
- `apps/game-server/src/application/policies/idempotency.policy.ts:6`
- `packages/rule-engine/src/application/apply-command.ts:51`
- `packages/rule-engine/src/application/apply-command.ts:58`
- `packages/shared-types/src/command/command.type.ts:6`
- `packages/shared-types/src/state/game.state.ts:8`
- `packages/test-fixtures/src/scenarios/two-player/idempotency.fixture.ts:7`
- `packages/test-fixtures/src/scenarios/two-player/version-conflict.fixture.ts:5`
- `docs/solutions/logic-errors/invalid-score-map-and-unnecessary-token-return-rule-engine-20260213.md`
- `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md`

### External

- [TypeScript Narrowing and Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Vitest Mocking and Timers](https://vitest.dev/guide/mocking.html)
- [Vitest `expect.assertions`](https://vitest.dev/api/expect.html#expect-assertions)
- [Firestore Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firestore Transaction Data Contention](https://firebase.google.com/docs/firestore/transaction-data-contention)
- [Firestore Node.js `runTransaction`](https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore.html#runtransactionupdatefunction-transactionoptions)
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)

### Related Plans

- `docs/plans/2026-02-12-feat-shared-types-contract-hardening-plan.md`
- `docs/plans/2026-02-12-feat-splendor-domain-policy-implementation-plan.md`
- `docs/plans/2026-02-12-feat-apply-command-state-transition-plan.md`
- `docs/plans/2026-02-12-feat-rule-engine-test-fixture-expansion-plan.md`
