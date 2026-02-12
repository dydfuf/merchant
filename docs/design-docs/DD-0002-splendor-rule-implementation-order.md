# Design Doc: DD-0002 Splendor Rule Implementation Order

## 1. 배경

현재 레포는 아키텍처 경계와 타입 스캐폴딩이 준비된 상태다.
다음 단계는 스플렌더 룰을 실제로 동작 가능한 순수 로직으로 구현하는 것이다.

룰은 카드/귀족 고정 데이터, 토큰 경제 규칙, 턴/종료 규칙이 강하게 연결되어 있어
구현 순서를 잘못 잡으면 재작업이 크게 늘어난다.

## 2. 문제 정의

아래 조건을 동시에 만족하는 구현 순서가 필요하다.

- 물리 카드 기반의 고정 데이터(90장 + 귀족 10장) 반영
- `rule-engine` 중심의 순수/결정론 로직 유지
- `game-server`는 오케스트레이션만 수행하고 룰 판단은 위임
- 테스트로 정책/시나리오/결정론을 단계적으로 고정

## 3. 목표

- 룰 구현 순서를 표준화해 재작업 비용을 줄인다.
- 데이터/정책/상태전이/서버연결의 경계를 명확히 분리한다.
- Phase 1 커맨드(`TAKE_TOKENS`, `RESERVE_CARD`, `BUY_CARD`, `END_TURN`)를 우선 완성한다.
- 2~4인 세팅 차이(토큰 개수, 귀족 배치 수)를 초기부터 반영한다.

## 4. 비목표

- 매칭/랭크/관전 등 Phase 2+ 기능 구현
- UI 개선 또는 화면 연출 최적화
- Firestore 운영 최적화(샤딩/캐시 등)
- 확장판(동방/도시 등) 룰 포함

## 5. 대안 비교

### 대안 A: 서버 핸들러부터 구현 후 룰엔진 보강

장점:

- 엔드투엔드 흐름을 빨리 볼 수 있음

단점:

- 룰 변경 시 서버/인프라 코드까지 연쇄 수정
- 경계 위반 가능성 증가

### 대안 B: 커맨드별로 필요한 부분만 즉시 구현(Ad-hoc)

장점:

- 초기 속도가 빠름

단점:

- 공통 규칙(토큰 한도, 귀족 방문, 종료 조건) 중복 가능성 큼
- 테스트 구조가 파편화됨

### 대안 C: 데이터 우선 + 도메인 정책 + 상태전이 엔진 순서로 구현

장점:

- 기준 데이터와 정책이 먼저 고정되어 재작업 감소
- 결정론 테스트와 경계 준수에 유리
- `game-server`는 얇은 오케스트레이션으로 유지 가능

단점:

- 초기에 보이는 사용자 기능이 적어 보일 수 있음

## 6. 최종 선택

대안 C를 채택한다.

구체 순서는 다음과 같다.

1. 고정 카드/귀족 카탈로그 확정
2. shared-types 계약 보강
3. 도메인 정책 구현
4. `apply-command` 상태전이 구현
5. 룰엔진 테스트/픽스처 확장
6. `game-server` 오케스트레이션 연결

## 7. 세부 설계

### 7.1 Step 1: 고정 데이터 카탈로그 구현

대상:

- `packages/rule-engine/src/domain/card-market/card.catalog.ts` (신규)
- `packages/rule-engine/src/domain/nobles/noble.catalog.ts` (신규)

내용:

- 개발 카드 90장의 고유 비용/점수/보너스 색/티어 정의
- 귀족 10장의 조건 및 점수 정의
- 2~4인 세팅 값(일반 토큰/귀족 노출 수) 정의

### 7.2 Step 2: shared-types 계약 보강

대상:

- `packages/shared-types/src/command/*`
- `packages/shared-types/src/event/*`
- `packages/shared-types/src/state/*`

내용:

- 예약 대상 구분(오픈 카드 vs 덱 탑)
- 토큰 10개 초과 시 반납 모델
- 턴 종료/게임 종료 이벤트의 필수 메타(턴 번호, 승자, 종료 사유) 고정

### 7.3 Step 3: 도메인 정책 구현

대상:

- `packages/rule-engine/src/domain/economy/economy.policy.ts`
- `packages/rule-engine/src/domain/card-market/card-market.policy.ts`
- `packages/rule-engine/src/domain/turn/turn.policy.ts`
- `packages/rule-engine/src/domain/nobles/nobles.policy.ts`
- `packages/rule-engine/src/domain/scoring/scoring.policy.ts`

내용:

- 토큰 획득 유효성(3색 1개씩, 동일색 2개 조건, 10개 한도)
- 예약/구매 가능성 검증 및 시장 리필
- 귀족 자동 방문 판정
- 15점 도달 시 종료 라운드 처리

### 7.4 Step 4: 상태전이 엔진 구현

대상:

- `packages/rule-engine/src/application/apply-command.ts`

내용:

- 입력: `GameState + Command + seed/context`
- 출력: `GameEvent[] + nextState(또는 patch) + 실패 코드`
- 모든 커맨드는 동일 포맷으로 처리

### 7.5 Step 5: 테스트/픽스처 확장

대상:

- `packages/rule-engine/tests/rules/**`
- `packages/rule-engine/tests/determinism/**`
- `packages/test-fixtures/src/**`

내용:

- 정책별 단위 테스트
- 동일 입력/seed 결과 동일성 테스트
- 2인/3인/4인 시나리오 픽스처

### 7.6 Step 6: game-server 연결

대상:

- `apps/game-server/src/application/services/game-command.service.ts`
- `apps/game-server/src/application/commands/*`

내용:

- idempotency -> version check -> rule-engine -> infra persist 순서 고정
- 애플리케이션은 룰 계산을 직접 구현하지 않음

## 8. 리스크 및 완화

- 리스크: 카드/귀족 고정 데이터 오입력
- 완화: 개수/티어/점수 분포 검증 테스트 추가

- 리스크: 룰 해석이 모호한 케이스(복수 귀족 자격, 종료 동률)
- 완화: 정책 파일에 명시 규칙 고정 + 테스트 케이스 문서화

- 리스크: 상태전이와 이벤트 로그 불일치
- 완화: 이벤트 적용 후 스냅샷 검증 테스트 도입

## 9. 성공 지표

- 카드 90장/귀족 10장 카탈로그 검증 테스트 통과
- Phase 1 커맨드 정책 테스트 통과
- 결정론 테스트(동일 입력/seed 동일 결과) 100% 통과
- 2~4인 세팅 시나리오 테스트 통과
- 경계 위반 lint(`no-restricted-imports`) 0건

## 10. 결정 필요 항목

- 카드/귀족 고정 테이블의 최종 기준 데이터 출처
- 복수 귀족 자격 동시 충족 시 처리 방식(자동 선택 vs 명시 선택)
- 종료 동률 시 우선순위(공식 규칙 기준 고정 필요)
