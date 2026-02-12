# AGENTS.md

## 1. 목적

이 파일은 `/Users/raon/Desktop/Development/merchant`에서 작업하는 에이전트가
아키텍처 우선 원칙을 지키며 일관되게 개발하도록 하는 실행 규칙이다.

## 2. 우선 읽기 문서

작업 시작 전에 아래 문서를 순서대로 확인한다.

1. `ARCHITECTURE.md`
2. `docs/concerns-and-boundaries.md`
3. `docs/agent-harness.md`
4. `README.md`
5. `docs/quality/QUALITY_SCORE.md`

## 3. 코드베이스 구조 기준

현재 기준 주요 구조:

- `apps/web`: 플레이어 클라이언트
- `apps/game-server`: 실시간 게임 서버
- `packages/shared-types`: 공유 타입 경계
- `packages/rule-engine`: 순수 룰 엔진
- `packages/infra-firestore`: Firestore 어댑터
- `packages/test-fixtures`: 테스트 데이터/시나리오

## 4. 아키텍처 핵심 원칙

- 클라이언트는 상태를 직접 수정하지 않고 Command만 전송한다.
- 서버가 룰을 판정하고 Event/Snapshot을 갱신한다.
- 룰 엔진은 순수 함수로 유지한다(I/O, 프레임워크 의존 금지).
- 경계 위반은 ESLint 규칙(`no-restricted-imports`)으로 차단한다.

## 5. 관심사 분리 규칙

- `presentation -> application -> domain -> types` 흐름을 유지한다.
- `domain -> infrastructure` 의존 금지.
- `presentation -> infrastructure` 직접 의존 금지.
- `shared-types`는 하위 기반 패키지이며 상위 레이어 의존 금지.

## 6. 필수 검증 명령

모든 의미 있는 코드 변경 후 아래를 실행한다.

```bash
pnpm lint
pnpm check-types
pnpm test
```

릴리즈 전 또는 테스트 체계 변경 시 추가 실행:

```bash
pnpm test:coverage
```

## 7. 테스트 작성 기준

- 새로운 정책/규칙 추가 시 최소 1개 이상의 단위 테스트를 함께 작성한다.
- 테스트는 변경 레이어에 맞는 위치에 둔다.
  - rule-engine: `packages/rule-engine/tests/**`
  - game-server: `apps/game-server/tests/**`

## 8. 문서 동기화 규칙

구조/경계/파이프라인 변경이 있으면 문서를 즉시 동기화한다.

- 우선순위:
  1. `ARCHITECTURE.md`
  2. `docs/concerns-and-boundaries.md`
  3. `docs/agent-harness.md`
  4. `README.md`
  5. `docs/quality/QUALITY_SCORE.md`

- 로컬 스킬 사용:
  - 스킬 정의: `.codex/skills/sync-codebase-docs/SKILL.md`
  - 체크리스트: `.codex/skills/sync-codebase-docs/references/doc-sync-checklist.md`
  - 스캔 스크립트: `.codex/skills/sync-codebase-docs/scripts/scan-codebase.sh`

문서 정합성 빠른 점검:

```bash
.codex/skills/sync-codebase-docs/scripts/scan-codebase.sh .
```

## 9. Git 작업 규칙

- 요청되지 않은 리팩터링/대량 포맷팅을 하지 않는다.
- 본인이 수정하지 않은 변경을 임의로 되돌리지 않는다.
- 예상치 못한 파일 변경을 발견하면 즉시 사용자에게 확인을 요청한다.
- 파괴적 명령(`reset --hard`, 강제 체크아웃 등)은 사용자 요청 없이는 사용하지 않는다.

## 10. 커뮤니케이션 규칙

- 사실과 추정을 구분해 설명한다.
- 변경 이유와 검증 결과를 파일 경로 중심으로 보고한다.
- 실패한 검증은 숨기지 않고 원인과 영향 범위를 함께 기록한다.
