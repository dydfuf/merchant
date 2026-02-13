# Merchant

스플렌더 보드게임을 웹 기술로 구현하는 Turborepo 모노레포입니다.
현재 단계는 **서버 권위 아키텍처를 유지한 로컬 실게임 루프(InMemory Registry)**를 우선 동작시키는 것입니다.

## 핵심 문서

- 아키텍처 기준: `ARCHITECTURE.md`
- 구현 시각화: `docs/implementation-architecture-visualization.md`
- 관심사 분리 규칙: `docs/concerns-and-boundaries.md`
- 에이전트 운영 규칙: `docs/agent-harness.md`
- 설계 템플릿: `docs/design-docs/TEMPLATE.md`
- 실행 계획 템플릿: `docs/exec-plans/TEMPLATE.md`
- 품질 지표: `docs/quality/QUALITY_SCORE.md`

## 모노레포 구조

- `apps/web`: 플레이어 클라이언트(Next.js)
- `apps/game-server`: 실시간 게임 서버(로컬 HTTP/WS 런타임 + 애플리케이션 오케스트레이션)
- `packages/ui`: 공유 UI 컴포넌트
- `packages/eslint-config`: ESLint 설정
- `packages/typescript-config`: TypeScript 설정
- `packages/rule-engine`: 순수 룰 엔진
- `packages/shared-types`: 공유 타입
- `packages/infra-firestore`: 저장소 어댑터(로컬 InMemory Registry + Firestore 구현 경계)
- `packages/test-fixtures`: 테스트 픽스처

## 실행 명령

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm check-types
pnpm test
pnpm test:watch
pnpm test:coverage
```

## 개발 원칙 요약

- 클라이언트는 Command만 전송, 서버가 룰 판정
- 룰 엔진은 순수 함수 + 결정론 보장
- 이벤트 로그 + 스냅샷 모델 유지
- 관심사 분리 규칙은 lint/test로 강제

## 로컬 실게임 실행

기본 포트:

- Web: `http://localhost:3000`
- Game Server: `http://127.0.0.1:4010`
- WS Endpoint: `ws://127.0.0.1:4010/ws`

실행:

```bash
pnpm install
pnpm dev
```

웹 주요 진입 경로:

- `/` : 랜딩
- `/auth/login` : 로그인
- `/lobby` : 로비
- `/games/[gameId]` : 게임 보드
- `/games/[gameId]/victory` : 승리 화면
- `/dev/local-runtime` : 기존 로컬 런타임 진단 콘솔

옵션 환경변수:

- `GAME_SERVER_HOST` (기본 `127.0.0.1`)
- `GAME_SERVER_PORT` (기본 `4010`)
- `NEXT_PUBLIC_GAME_SERVER_URL` (기본 `http://127.0.0.1:4010`)
