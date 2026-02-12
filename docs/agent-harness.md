# Agent Harness

## 1. 목적

이 문서는 `merchant`에서 에이전트 기반 개발을 안정적으로 수행하기 위한 운영 규칙을 정의한다.
핵심은 다음이다.

- 작업 시작 전 설계 의도 명시
- 구현 중 경계 위반 자동 감지
- 완료 후 품질 점수 및 부채 상태 기록

## 2. 레포 내 표준 위치

- 설계 문서: `docs/design-docs/`
- 실행 계획: `docs/exec-plans/active/`
- 완료 계획 보관: `docs/exec-plans/completed/`
- 품질 지표: `docs/quality/QUALITY_SCORE.md`
- 시스템 기준 아키텍처: `ARCHITECTURE.md`
- 관심사 분리 규칙: `docs/concerns-and-boundaries.md`

## 3. 표준 개발 루프

1. 문제 정의

- 요구사항/제약/성공기준을 design doc으로 작성

2. 실행 계획 작성

- 파일 단위 변경 예정, 테스트 계획, 위험요소를 exec plan에 작성

3. 구현

- 계획 범위 내 변경 수행
- 경계 위반 여부 상시 확인

4. 검증

- lint, typecheck, test 실행
- 불합격 시 원인과 수정 기록

5. 마무리

- exec plan을 `completed/`로 이동
- 품질 점수 업데이트

## 4. 에이전트 작업 단위 규칙

- 하나의 작업은 하나의 명확한 목표만 가진다.
- 목표가 크면 실행 계획 단계로 분할한다.
- 설계 근거 없는 대규모 리팩터링 금지
- 실패한 실험은 삭제하지 말고 요약을 남긴다.

## 5. 품질 게이트

최소 게이트(모든 기능 변경에 적용):

- `pnpm lint`
- `pnpm check-types`
- `pnpm test`

권장 게이트(릴리즈/도메인 변경 시):

- `pnpm test:coverage`
- determinism 테스트(동일 입력 동일 결과)
- command idempotency 테스트
- schema compatibility 테스트

## 6. 현재 적용 상태 (2026-02-12)

- Turborepo task: `test`, `test:watch`, `test:coverage` 적용
- Vitest workspace: 루트 `vitest.workspace.ts` + 워크스페이스별 `vitest.config.ts` 적용
- ESLint 경계 강제: `no-restricted-imports` 기반 패키지/레이어 규칙 적용
- `apps/game-server` application/presentation에서 infra 구현 직접 import 금지 규칙 적용
- Vitest `passWithNoTests`는 전역 비활성화하고, 테스트 미보유 패키지에만 개별 허용

## 7. 산출물 기준

### Design doc 최소 항목

- 배경/문제
- 목표/비목표
- 대안 비교
- 최종 선택 및 이유
- 위험요소

### Exec plan 최소 항목

- 범위
- 단계별 작업
- 검증 방법
- 롤백 전략

### 완료 보고 최소 항목

- 변경 파일 목록
- 테스트 결과
- 남은 리스크

## 8. 경계 위반 감지 전략

- 정적: eslint import rule / dependency graph 검사
- 동적: command 처리 경로에서 version/idempotency assert
- 리뷰: PR 체크리스트 기반 수동 검증

## 9. 기술 부채 관리

- 부채는 "기록 후 상환" 원칙을 따른다.
- 임시 우회는 design doc에 만료 조건을 명시한다.
- `docs/quality/QUALITY_SCORE.md`에 주기적으로 점수와 근거를 업데이트한다.

## 10. 커뮤니케이션 원칙

- 문장은 짧고 단정적으로 작성한다.
- 추정과 사실을 분리해 기록한다.
- 결정되지 않은 항목은 TODO가 아니라 "결정 필요"로 명시한다.

## 11. 템플릿 연결

- 설계 템플릿: `docs/design-docs/TEMPLATE.md`
- 실행 계획 템플릿: `docs/exec-plans/TEMPLATE.md`
