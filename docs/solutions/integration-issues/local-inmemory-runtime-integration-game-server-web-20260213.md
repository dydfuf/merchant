---
module: Game Server / Web / Infra Firestore
date: 2026-02-13
problem_type: integration_issue
component: development_workflow
symptoms:
  - "`game-server`에 HTTP/WS listen 엔트리와 `dev` 스크립트가 없어 로컬 서버를 즉시 실행할 수 없었다"
  - "`web`이 기본 템플릿 화면 상태라 실제 게임 생성/조회/커맨드 전송 루프를 수동 검증할 수 없었다"
  - "조회/헬스/구독 경로가 비어 있어 서버 오케스트레이션 결과를 네트워크 경로로 확인할 수 없었다"
  - "수동 스모크 절차가 표준화되지 않아 실행 로그 기준 PASS/FAIL를 반복 재현하기 어려웠다"
root_cause: incomplete_setup
resolution_type: workflow_improvement
severity: high
tags: [local-runtime, websocket, inmemory-registry, smoke-test, game-server, web]
---

# Troubleshooting: Local InMemory Runtime Integration for game-server and web

## Problem
룰 엔진과 서버 오케스트레이션 단위 테스트는 존재했지만, 실제 네트워크 런타임(HTTP/WS)과 웹 클라이언트 연결이 비어 있어 로컬에서 "플레이 가능한 게임 루프"를 실행할 수 없었다. 특히 Firestore 대신 InMemory Registry로 빠르게 개발하려는 목표와 현재 구현 사이에 통합 공백이 있었다.

## Environment
- Module: Game Server / Web / Infra Firestore
- Affected Component: 로컬 런타임 엔트리, 저장소 어댑터, 수동 스모크 워크플로
- Date Solved: 2026-02-13

## Symptoms
- `apps/game-server`에 실행 엔트리/스크립트가 없어 로컬 서버 부팅이 불가능했다.
- `GET /health`, `POST /local/games`, `POST /local/games/:gameId/commands`, `WS /ws` 경로를 연결해 확인할 수 없었다.
- 멱등/버전 충돌/권한 거절 시나리오를 "실행 로그" 기준으로 반복 검증할 방법이 없었다.

## What Didn't Work

**Attempted Solution 1:** application 계층 단위 테스트만으로 완료 판단
- **Why it failed:** 실제 HTTP 요청, WS 구독, 브로드캐스트 경로가 검증되지 않아 런타임 회귀를 놓칠 수 있었다.

**Attempted Solution 2:** 서버/웹을 수동으로 임의 조작하며 비정형 확인
- **Why it failed:** 매번 절차와 기대 결과가 달라지고, 로그 근거가 남지 않아 재현성과 공유성이 낮았다.

## Solution
로컬 MVP를 "InMemory Registry 기반 통합 런타임"으로 고정하고 서버, 웹, 테스트, 스모크 스크립트를 한 번에 연결했다.

1. `infra-firestore`에 인메모리 저장소 경계를 구현했다.
- `InMemoryGameRepository`, `InMemoryCommandRepository`, `InMemoryEventRepository`, `InMemoryGameTransactionRunner` 추가
- 저장/조회 시 `structuredClone`으로 외부 변경 전파를 차단

2. `game-server`에 로컬 런타임 엔트리를 구현했다.
- `src/runtime/local-server.ts`에서 HTTP + WS + CORS + 구독 브로드캐스트를 통합
- `src/main.ts`에서 환경 로드/부팅/시그널 종료 처리 추가
- `src/bootstrap/env.ts`, `src/presentation/http/health/*`, `src/application/services/game-query.service.ts` 구현

3. `LocalGameRegistryRepository`로 서버 포트와 InMemory 저장소를 연결했다.
- 트랜잭션 내에서 `command -> events -> snapshot`을 원자적으로 갱신
- 저장 후 구독자에게 `GAME_EVENTS` + `GAME_SNAPSHOT` 순서로 publish

4. `web`에 로컬 실행 UI와 클라이언트 유틸을 추가했다.
- 서버 URL/WS URL 계산, idempotency key 생성 유틸 구현
- 게임 생성, 구독, 커맨드 전송이 가능한 페이지로 교체

5. 자동 회귀 방어를 위한 테스트/스모크를 추가했다.
- 통합 테스트: `apps/game-server/tests/runtime/local-server.integration.spec.ts`
- 유틸 테스트: `apps/web/tests/local-game-flow.spec.tsx`
- 수동 실행 로그 표준화 스크립트: `scripts/smoke-local-runtime.sh`

**Code changes (요약):**
```ts
// apps/game-server/src/runtime/local-server.ts
if (request.method === "POST" && pathname === "/local/games") {
  const context = createLocalGameContext({ gameId, playerIds, seed });
  await repository.createGame(context);
  sendJson(response, 201, { gameId, state: context.state, playerOrder: context.playerOrder });
}
```

```ts
// apps/game-server/src/infrastructure/repositories/local-game-registry.repo.ts
const update = await withGameTransaction(this.#transactionRunner, input.command.gameId, async () => {
  await this.#commandRepository.saveSuccess(...);
  await this.#eventRepository.append(input.command.gameId, input.events);
  await this.#gameRepository.save(...);
  return { gameId: input.command.gameId, events: cloneEvents(input.events), state: cloneState(input.nextState) };
});
this.#publish(update);
```

```bash
# scripts/smoke-local-runtime.sh
scripts/smoke-local-runtime.sh --start-server
# [PASS] smoke-local-runtime health:ok | create:game-... | ws:initial-snapshot | command:accepted+broadcast | command:replayed | command:version-conflict | command:unauthorized
```

**Commands run:**
```bash
pnpm lint
pnpm check-types
pnpm test
pnpm test:coverage
scripts/smoke-local-runtime.sh --start-server
```

## Why This Works
1. 서버 런타임과 저장소 경계를 동시에 구현해 "코어 오케스트레이션만 통과하는 상태"를 "실행 가능한 전체 루프"로 전환했다.
2. InMemory Registry가 Firestore 형태의 포트를 유지해 로컬 속도와 아키텍처 일관성을 함께 확보했다.
3. WS 구독 브로드캐스트를 포함한 통합 테스트/스모크가 멱등, 버전 충돌, 권한 검증까지 네트워크 레벨에서 고정했다.
4. 실행 로그 기반 시나리오를 스크립트화해 누구나 동일 기준으로 수동 검증할 수 있게 했다.

## Prevention
- 런타임 관련 변경 시 `scripts/smoke-local-runtime.sh --start-server`를 로컬 기본 검증 절차로 유지한다.
- `apps/game-server/tests/runtime/local-server.integration.spec.ts`에 새 엔드포인트/메시지 타입 회귀 케이스를 추가한다.
- Firestore 실연동 전까지는 `LocalGameRegistryRepository` 포트 계약을 우선 기준으로 삼고 직접 infra 우회 호출을 금지한다.
- README의 로컬 실행 절차와 테스트 명령을 코드 변경과 동시에 동기화한다.

## Related Issues
- Required Reading: `docs/solutions/patterns/critical-patterns.md`
- `docs/solutions/workflow-issues/scenario-expected-outcome-contract-sync-20260213.md`
- `docs/solutions/workflow-issues/contract-drift-shared-types-20260213.md`
- `docs/plans/2026-02-13-feat-local-game-runtime-inmemory-registry-plan.md`
