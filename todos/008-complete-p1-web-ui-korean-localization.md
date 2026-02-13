---
status: complete
priority: p1
issue_id: "008"
tags: [web, ui, localization, korean]
dependencies: ["007"]
---

# Web UI 한글화 실행

## Problem Statement

`apps/web` 사용자 노출 문구가 영어/한국어 혼재 상태다. 전 화면 문구를 한국어 기준으로 통일해야 한다.

## Acceptance Criteria

- [x] 랜딩/인증/로비/게임/승리/로컬런타임 문구가 한국어로 표시된다.
- [x] 로비 상태 스타일 키는 유지되고 표시 라벨만 한국어화된다.
- [x] 사용자 노출 에러 메시지는 한국어 설명을 우선한다.
- [x] `html lang` 및 메타 설명이 한국어 기준으로 정합하다.
- [x] `pnpm lint`, `pnpm check-types`, `pnpm test` 통과.

## Work Log

### 2026-02-13 - Execution Start

**By:** Codex

**Actions:**
- 계획 문서 기반 구현 시작
- 번역 대상 파일/리스크(status key 결합, 에러코드 노출) 식별

### 2026-02-13 - Implementation Completed

**By:** Codex

**Actions:**
- 랜딩/인증/로비/게임/승리/로컬런타임 화면 문구를 한국어로 전환
- `statusText` 기반 UI 로직을 `statusKey + statusLabel` 구조로 분리
- `apps/web/src/presentation/i18n/error-message.ts`로 에러 코드 한국어 매핑 추가
- `apps/web/src/presentation/i18n/ko.ts`를 추가해 로비 탭/상태 라벨 상수화
- 검증 완료: `pnpm lint`, `pnpm check-types`, `pnpm test`

**Learnings:**
- 스타일 키(`data-status`)와 표시 라벨 분리는 번역 시 UI 회귀를 예방하는 핵심 패턴이다.
- 에러 코드를 원문 그대로 노출하기보다 한국어 설명 + 코드 병기가 디버깅과 UX를 동시에 만족시킨다.
