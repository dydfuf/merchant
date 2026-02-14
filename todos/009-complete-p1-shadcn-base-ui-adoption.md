# 009 - shadcn + Base UI 도입

## Context
- Plan: `docs/plans/2026-02-13-feat-shadcn-ui-base-ui-adoption-plan.md`
- Branch: `codex/feat-shadcn-base-ui-adoption`

## Tasks
- [x] Foundation: Tailwind v4/PostCSS 설정 및 `@repo/ui` 스타일 엔트리 추가
- [x] shadcn layer: `packages/ui`에 button/input/card/badge/tabs + 유틸/토큰 브릿지 추가
- [x] headless layer: `packages/ui`에 Base UI dialog/drawer-preview export 추가
- [x] Overlay migration: `apps/web`의 CardDetail/Rivals/Vault를 Base UI 기반으로 전환
- [x] Guardrails: `@headlessui/*`, `@radix-ui/*` import 차단 규칙 추가
- [x] Tests: 접근성 회귀 테스트를 Base UI 흐름 기준으로 갱신
- [x] Plan sync: 실행한 항목의 plan 체크박스 업데이트
- [x] Validation: `pnpm lint`, `pnpm check-types`, `pnpm test`
