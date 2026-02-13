# Quality Score

## 기준

- Architecture Boundary: 0-5
- Type Safety: 0-5
- Test Confidence: 0-5
- Runtime Reliability: 0-5
- Documentation Freshness: 0-5

## 현재 점수 (업데이트: 2026-02-13)

- Date: 2026-02-13
- Architecture Boundary: 4
- Type Safety: 4
- Test Confidence: 4
- Runtime Reliability: 3
- Documentation Freshness: 5
- Total: 20/25

## 메모

- ESLint `no-restricted-imports` 기반 경계 강제 적용
- `apps/game-server`에서 application/presentation -> infra 구현 직접 import 차단 규칙 추가
- Vitest workspace + Turbo 테스트 파이프라인(`test`, `test:watch`, `test:coverage`) 적용
- Vitest `passWithNoTests` 전역 허용 제거, 패키지별 명시 허용으로 전환
- 로컬 HTTP/WS 런타임 + InMemory Registry 경로 구현
- game-server 런타임 통합 테스트(`local-server.integration.spec.ts`) 추가
- web 로컬 클라이언트 유틸 테스트(`local-game-flow.spec.tsx`) 추가
