# Merchant

스플렌더 보드게임을 웹 기술로 구현하는 Turborepo 모노레포입니다.
현재 단계는 **아키텍처와 경계 정의를 먼저 고정**하는 것을 목표로 합니다.

## 핵심 문서

- 아키텍처 기준: `ARCHITECTURE.md`
- 관심사 분리 규칙: `docs/concerns-and-boundaries.md`
- 에이전트 운영 규칙: `docs/agent-harness.md`
- 설계 템플릿: `docs/design-docs/TEMPLATE.md`
- 실행 계획 템플릿: `docs/exec-plans/TEMPLATE.md`
- 품질 지표: `docs/quality/QUALITY_SCORE.md`

## 모노레포 구조

- `apps/web`: 플레이어 클라이언트(Next.js)
- `apps/game-server`: 실시간 게임 서버(스캐폴딩)
- `packages/ui`: 공유 UI 컴포넌트
- `packages/eslint-config`: ESLint 설정
- `packages/typescript-config`: TypeScript 설정
- `packages/rule-engine`: 순수 룰 엔진
- `packages/shared-types`: 공유 타입
- `packages/infra-firestore`: Firestore 어댑터
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
