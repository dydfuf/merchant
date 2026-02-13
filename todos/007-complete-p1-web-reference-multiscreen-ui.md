---
status: complete
priority: p1
issue_id: "007"
tags: [web, nextjs, ui, app-router]
dependencies: []
---

# Web Reference Multi-Screen UI 구현

## Problem Statement

`apps/web/reference`의 9개 화면이 실제 App Router 라우트에 연결되어 있지 않고, 루트 페이지에 로컬 런타임 진단 UI만 존재한다.

## Findings

- 현재 `apps/web/app/page.tsx`는 로컬 서버 진단 UI를 직접 렌더링한다.
- `/auth/login`, `/auth/denied`, `/lobby`, `/games/[gameId]`, `/games/[gameId]/victory`, `/dev/local-runtime` 라우트가 없다.
- 계획 문서에서 `games/[gameId]`를 server wrapper + client child 구조로 확정했다.

## Proposed Solutions

### Option 1: 전면 라우트/컴포넌트 분리 구현

**Approach:** 계획대로 라우트와 presentation 컴포넌트를 분리하고, 기존 로컬 런타임 UI를 `/dev/local-runtime`으로 이동한다.

**Pros:**
- 계획과 아키텍처 경계가 일치한다.
- 제품 플로우 검증이 가능해진다.

**Cons:**
- 변경 파일 수가 많다.

**Effort:** 중

**Risk:** 중

## Recommended Action

Option 1을 수행한다. 라우트 분리 + 게임 화면 server/client 분리 + 로컬 런타임 이동 + 테스트/검증 명령까지 완료한다.

## Technical Details

**Affected files:**
- `apps/web/app/**`
- `apps/web/src/presentation/**`
- `apps/web/src/lib/**`
- `apps/web/tests/**`
- `docs/plans/2026-02-13-feat-web-reference-multiscreen-ui-plan.md`

## Acceptance Criteria

- [x] 멀티 라우트가 생성되고 각 레퍼런스 화면이 대응된다.
- [x] `/games/[gameId]`는 server wrapper + client child 구조다.
- [x] 기존 로컬 런타임 UI는 `/dev/local-runtime`에서 동작한다.
- [x] mock auth 가드가 `ENABLE_LOCAL_AUTH_MOCK` 기준으로 적용된다.
- [x] `pnpm lint`, `pnpm check-types`, `pnpm test` 통과.

## Work Log

### 2026-02-13 - Initial Execution Start

**By:** Codex

**Actions:**
- 계획 문서와 현재 `apps/web` 상태 점검
- 실행 브랜치 `codex/web-reference-multiscreen-ui` 생성
- 구현 단위를 정리하고 작업 todo 생성

**Learnings:**
- 기존 로컬 런타임 UI는 재사용 가치가 높아 `/dev/local-runtime` 이동이 적합하다.
- server wrapper + client child 구조를 강제하면 App Router 경계가 명확해진다.

### 2026-02-13 - Implementation Completed

**By:** Codex

**Actions:**
- `apps/web/app`에 landing/auth/lobby/game/victory/dev-local-runtime 라우트 생성
- `apps/web/src/presentation/**`에 화면 컴포넌트와 게임 오버레이 구성 추가
- `apps/web/src/lib/local-auth.ts`, `apps/web/src/lib/routes.ts` 유틸 추가
- 접근성 오버레이 훅(`Escape`, `Tab` trap, 포커스 복귀, inert 배경 처리) 적용
- 루트 검증 명령 실행: `pnpm lint`, `pnpm check-types`, `pnpm test`

**Learnings:**
- 기존 런타임 UI를 분리 보존하면서 제품형 라우트를 추가하면 디버그 동선과 사용자 동선을 동시에 유지할 수 있다.
- 환경변수 가드를 유틸/테스트로 분리하면 mock auth 보안 회귀를 쉽게 방지할 수 있다.
