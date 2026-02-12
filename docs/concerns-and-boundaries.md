# Concerns And Boundaries

## 1. 목적

이 문서는 `merchant`에서 관심사 분리를 어떻게 강제할지 정의한다.
목표는 다음과 같다.

- 변경 영향 범위 축소
- 동시 개발 충돌 감소
- 에이전트/사람 모두가 동일한 경계 규칙 준수

## 2. 분리 축

관심사 분리는 두 축으로 관리한다.

- 수평 분리(Horizontal): 레이어 경계
- 수직 분리(Vertical): 도메인 경계

둘 중 하나라도 깨지면 구조 부채로 간주한다.

## 3. 수평 레이어

아래 레이어는 서버와 클라이언트 모두에 공통 적용한다.

1. `types` 레이어

- 데이터 구조, enum, 스키마
- 비즈니스 로직 없음

2. `domain` 레이어

- 순수 규칙(예: 카드 구매 가능 여부)
- I/O 금지, 시간/랜덤은 주입

3. `application` 레이어

- 유스케이스 오케스트레이션
- 트랜잭션 경계, 권한 검증, 멱등성 처리

4. `infrastructure` 레이어

- Firestore, Auth, Pub/Sub, 로깅 등 외부 시스템 연결
- 도메인 판단 금지

5. `presentation` 레이어

- API DTO 변환, UI 렌더링 상태 변환
- 룰 판정 금지

## 4. 허용 의존성

```text
presentation -> application -> domain -> types
infrastructure -> types
application -> infrastructure (via interface/port)
```

허용되지 않는 의존성:

- `domain -> infrastructure`
- `presentation -> infrastructure` (직접 DB 접근)
- `infrastructure -> domain` (룰 판정 로직 포함)
- `application <-> presentation` 순환

## 5. 수직 도메인 경계

초기 도메인을 다음처럼 분리한다.

- `lobby`: 방 생성/참가/준비
- `match`: 게임 생명주기(시작/종료/승자)
- `turn`: 턴 소유권 및 순서
- `economy`: 보석, 골드, 지불
- `card-market`: 카드 공개/예약/구매
- `nobles`: 귀족 조건 체크
- `scoring`: 점수 계산 및 동점 처리

규칙:

- 도메인은 다른 도메인의 내부 상태를 직접 수정하지 않는다.
- 도메인 간 통신은 `event` 또는 `application orchestrator`를 통해서만 수행한다.

## 6. 패키지 맵핑 규칙

권장 패키지:

- `packages/shared-types`
- `packages/rule-engine`
- `packages/infra-firestore`
- `apps/game-server`
- `apps/web`

맵핑:

- `rule-engine`: `domain + types`
- `infra-firestore`: `infrastructure`
- `game-server`: `application + presentation(api/ws adapter)`
- `web`: `presentation`

## 7. 코드 레벨 규칙

### 7.1 Import 규칙

- `apps/web`에서 `@repo/infra-firestore` import 금지
- `packages/rule-engine`에서 `firebase-*`, `next/*`, `react` import 금지
- `apps/game-server`의 handler는 룰 계산을 직접 구현하지 않고 `rule-engine`만 호출

현재 반영된 강제 위치:

- `apps/web/eslint.config.js`
- `apps/game-server/eslint.config.js`
- `packages/rule-engine/eslint.config.mjs`
- `packages/shared-types/eslint.config.mjs`
- `packages/infra-firestore/eslint.config.mjs`

### 7.2 파일명/역할 규칙

- `*.command.ts`: 입력 모델
- `*.event.ts`: 상태 변화 기록 모델
- `*.service.ts`: application orchestration
- `*.repo.ts`: infra persistence adapter
- `*.policy.ts`: 순수 검증 규칙

## 8. 테스트 경계

1. 도메인 테스트

- 대상: `packages/rule-engine`
- 형식: 순수 함수 단위 테스트 + property/determinism 테스트

2. 애플리케이션 테스트

- 대상: command handler
- 형식: 버전 충돌, 멱등성, 권한 검증

3. 인프라 테스트

- 대상: Firestore repo adapter
- 형식: 트랜잭션 성공/실패 및 직렬화 검증

4. 계약 테스트

- 대상: `shared-types` 기반 클라이언트-서버 이벤트 계약
- 형식: schema compatibility

## 9. 리뷰 체크리스트

PR마다 아래를 확인한다.

- [ ] 새로운 코드가 어느 레이어/도메인에 속하는지 명확한가?
- [ ] 금지 의존성이 생기지 않았는가?
- [ ] 룰 로직이 infra 또는 UI로 새어 나가지 않았는가?
- [ ] 이벤트/스냅샷 버전 규칙이 유지되는가?
- [ ] 테스트가 해당 경계에서 실패를 잡아내는가?

## 10. 흔한 위반 패턴과 대응

- 패턴: UI가 구매 가능 여부를 자체 계산
- 대응: UI는 서버 계산 결과를 표시만 하고, 클라이언트 계산은 힌트로만 사용

- 패턴: Firestore adapter 안에 도메인 분기(`if canBuy`) 추가
- 대응: adapter는 읽기/쓰기만 수행, 판단은 rule-engine으로 이동

- 패턴: 빠른 개발을 이유로 `any` 기반 command payload 사용
- 대응: `shared-types`의 discriminated union으로 강제

## 11. 도입 순서

1. `shared-types`에 Command/Event/State 타입 확정
2. `rule-engine`에 순수 유스케이스 구현
3. `game-server`에서 command handler + version check 추가
4. `infra-firestore` adapter 연결
5. `web`은 command submit + realtime read-model 구독
6. 의존성 lint 규칙 추가 및 CI 강제(로컬 lint 강제는 적용 완료, CI 파이프라인 강제는 다음 단계)
