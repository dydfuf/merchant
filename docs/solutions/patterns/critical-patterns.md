# Critical Patterns (Required Reading)

아래 패턴은 재발 시 비용이 큰 이슈를 막기 위한 필수 규칙이다.

## 1. Local Runtime Vertical Slice Completion (ALWAYS REQUIRED)

### ❌ WRONG (코어 단위 테스트만 통과시키고 런타임 통합을 생략)
```bash
pnpm --filter game-server test
# 여기서 종료: HTTP/WS 엔트리, 웹 연결, 스모크 로그 검증이 없다.
```

```ts
// apps/game-server/src/index.ts
export * from "./application/services/game-command.service.js";
// main/runtime 엔트리가 없으면 로컬 실게임 루프를 검증할 수 없다.
```

### ✅ CORRECT
```ts
// apps/game-server/src/main.ts
const env = readGameServerEnv();
const server = createLocalGameServer({
  host: env.host,
  port: env.port,
  logger,
});
await server.start();
```

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm test:coverage
scripts/smoke-local-runtime.sh --start-server
```

**Why:** 단위 테스트만으로는 HTTP 요청, WS 구독/브로드캐스트, 권한/멱등/버전 충돌 같은 네트워크 경로 회귀를 잡을 수 없다. 런타임 엔트리 + 저장소 연결 + 스모크 로그 검증을 한 배치로 묶어야 로컬 게임 루프 완성 여부를 정확히 판단할 수 있다.

**Placement/Context:** `apps/game-server`, `apps/web`, `packages/infra-firestore`를 함께 건드리는 로컬 런타임/통합 작업 전반에 적용한다. 특히 Firestore 실연동 전 InMemory Registry를 운영 기준으로 쓸 때 필수다.

**Documented in:** `docs/solutions/integration-issues/local-inmemory-runtime-integration-game-server-web-20260213.md`
