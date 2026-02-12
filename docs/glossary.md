# Merchant Glossary

업데이트 기준: 2026-02-12

이 문서는 `merchant` 레포에서 반복적으로 쓰이는 핵심 용어를 정리한 용어집이다.

## 1. 아키텍처/경계 용어

| 용어 | 정의 | 관련 위치 |
| --- | --- | --- |
| Server-Authoritative Game | 클라이언트는 상태를 직접 수정하지 않고 Command만 보내며, 서버가 최종 판정을 수행하는 구조. | `ARCHITECTURE.md` |
| Command | 플레이어의 의도(행동 요청). 서버로 전송되는 입력 모델. | `packages/shared-types/src/command/*.ts` |
| Event | 서버가 룰 판정 후 기록하는 상태 변화 사실. | `packages/shared-types/src/event/*.ts` |
| Snapshot(Read Model) | 현재 게임 상태를 빠르게 읽기 위한 스냅샷 문서(`games`). | `ARCHITECTURE.md` |
| Append-Only Event Log | 이벤트를 수정/삭제하지 않고 누적(append)하는 기록 모델. | `ARCHITECTURE.md` |
| Deterministic Rule Engine | 동일 입력(`state`, `command`, `seed`)에 대해 동일 결과를 반환하는 순수 룰 엔진. | `packages/rule-engine/src/application/apply-command.ts` |
| Mechanical Guardrail | 아키텍처 규칙을 lint/test/파이프라인으로 강제하는 장치. | `ARCHITECTURE.md`, `docs/agent-harness.md` |
| 관심사 분리(Horizontal) | `presentation -> application -> domain -> types` 레이어 흐름을 강제하는 분리 축. | `docs/concerns-and-boundaries.md` |
| 도메인 분리(Vertical) | `lobby`, `match`, `turn`, `economy`, `card-market`, `nobles`, `scoring`로 책임을 나누는 분리 축. | `docs/concerns-and-boundaries.md` |
| Port/Adapter | 애플리케이션이 인프라 구현에 직접 의존하지 않도록 중간 인터페이스(port)를 두는 방식. | `apps/game-server/src/application/commands/command-handler.port.ts` |

## 2. 게임 도메인 용어

| 용어 | 정의 | 관련 위치 |
| --- | --- | --- |
| TokenColor | 토큰 색상 집합: `diamond`, `sapphire`, `emerald`, `ruby`, `onyx`, `gold`. | `packages/shared-types/src/state/player.state.ts` |
| GemColor | `gold`를 제외한 일반 보석 색상 집합. | `packages/shared-types/src/state/player.state.ts` |
| Player Token Limit | 플레이어가 보유 가능한 최대 토큰 수(10개). | `packages/rule-engine/src/domain/economy/economy.policy.ts` |
| DeckTier | 개발 카드 티어(`1 \| 2 \| 3`). | `packages/shared-types/src/state/board.state.ts` |
| Open Market | 보드에 공개된 구매/예약 가능 카드 영역. | `packages/shared-types/src/state/board.state.ts` |
| Reserved Card | 플레이어가 개인 슬롯에 예약해 둔 카드. | `packages/shared-types/src/state/player.state.ts` |
| Reserve Limit | 한 플레이어가 예약할 수 있는 카드 최대 수(3장). | `packages/rule-engine/src/domain/card-market/card-market.policy.ts` |
| Noble | 조건 충족 시 자동 방문(획득)되는 귀족 타일(점수 3점). | `packages/rule-engine/src/domain/nobles/*.ts` |
| Final Round | 목표 점수 도달 후 종료 조건 충족 시까지 진행되는 마지막 라운드 상태. | `packages/rule-engine/src/domain/turn/turn.policy.ts` |
| Target Score | 파이널 라운드 트리거 기준 점수(15점). | `packages/rule-engine/src/domain/scoring/scoring.policy.ts` |
| Tie-breaker | 동점 시 구매 카드 수가 더 적은 플레이어를 우선하는 승자 결정 규칙. | `packages/rule-engine/src/domain/scoring/scoring.policy.ts` |
| Deterministic Deck Top | `seed + version + tier` 기반 해시로 덱 상단 카드를 결정론적으로 선택하는 방식. | `packages/rule-engine/src/domain/card-market/card-market.policy.ts` |

## 3. 공유 타입/계약 용어

| 용어 | 정의 | 관련 위치 |
| --- | --- | --- |
| GameId | 게임 식별자 타입(`string`). | `packages/shared-types/src/common/game-id.ts` |
| Version | 게임 상태 버전(`number`). 상태 전이마다 증가한다. | `packages/shared-types/src/common/version.ts` |
| expectedVersion | 클라이언트가 기대하는 상태 버전. 서버는 실제 버전과 비교해 충돌을 판정한다. | `packages/shared-types/src/command/*.ts` |
| IdempotencyKey | 중복 전송된 명령을 식별해 멱등 처리하기 위한 키. | `packages/shared-types/src/common/idempotency-key.ts` |
| GameStatus | `WAITING`, `IN_PROGRESS`, `ENDED` 상태 열거. | `packages/shared-types/src/state/game.state.ts` |
| GameState | 게임의 정규 상태 모델(보드/플레이어/턴/버전 포함). | `packages/shared-types/src/state/game.state.ts` |
| BoardState | 은행 토큰, 오픈 마켓 카드, 오픈 귀족 등 보드 상태 모델. | `packages/shared-types/src/state/board.state.ts` |
| PlayerState | 플레이어 점수/토큰/보너스/예약카드/구매카드/귀족 보유 상태 모델. | `packages/shared-types/src/state/player.state.ts` |
| TAKE_TOKENS | 보석 토큰 획득 명령. 필요 시 `returnedTokens`로 반납 정보를 포함한다. | `packages/shared-types/src/command/take-tokens.command.ts` |
| RESERVE_CARD | 카드 예약 명령. `OPEN_CARD` 또는 `DECK_TOP` 대상을 가진다. | `packages/shared-types/src/command/reserve-card.command.ts` |
| BUY_CARD | 카드 구매 명령. 구매 원천은 `OPEN_MARKET` 또는 `RESERVED`. | `packages/shared-types/src/command/buy-card.command.ts` |
| END_TURN | 턴 종료 명령. 종료 사유(`ACTION_COMPLETED`, `MANUAL`, `RECOVERY`)를 가진다. | `packages/shared-types/src/command/end-turn.command.ts` |
| TOKENS_TAKEN | 토큰 획득 이벤트. | `packages/shared-types/src/event/tokens-taken.event.ts` |
| CARD_RESERVED | 카드 예약 이벤트(대상 종류, 티어, 골드 획득 여부 포함). | `packages/shared-types/src/event/card-reserved.event.ts` |
| CARD_BOUGHT | 카드 구매 이벤트(지불 토큰, 획득 보너스 색상, 점수 변화 포함). | `packages/shared-types/src/event/card-bought.event.ts` |
| TURN_ENDED | 턴 종료 이벤트(이전/다음 플레이어, 턴 번호, 라운드 번호 포함). | `packages/shared-types/src/event/turn-ended.event.ts` |
| GAME_ENDED | 게임 종료 이벤트(승자 목록, 최종 점수 맵, 종료 원인 포함). | `packages/shared-types/src/event/game-ended.event.ts` |

## 4. 서버 오케스트레이션/인프라 용어

| 용어 | 정의 | 관련 위치 |
| --- | --- | --- |
| GameCommandService | `idempotency -> version check -> rule-engine -> persist` 순서로 명령을 처리하는 애플리케이션 서비스. | `apps/game-server/src/application/services/game-command.service.ts` |
| CommandDispatcherService | 프레젠테이션 계층에서 받은 Command를 핸들러에 위임하는 얇은 디스패처. | `apps/game-server/src/application/commands/command-dispatcher.service.ts` |
| GameGateway | WS 진입점. `auth.userId`와 `command.actorId` 일치 여부를 먼저 검증한다. | `apps/game-server/src/presentation/ws/game.gateway.ts` |
| UNAUTHORIZED_ACTOR | 인증 사용자와 명령 주체가 다를 때 반환되는 게이트웨이 거절 사유. | `apps/game-server/src/presentation/ws/ws.types.ts` |
| GameCommandRepositoryPort | 게임 컨텍스트 조회/중복 명령 조회/성공 결과 저장을 추상화한 저장소 포트. | `apps/game-server/src/application/commands/command-handler.port.ts` |
| InMemoryGameCommandRepository | 테스트/스캐폴딩용 메모리 저장소 구현체. | `apps/game-server/src/infrastructure/repositories/in-memory-command-handler.repo.ts` |
| Command Fingerprint | 명령 payload를 정렬-직렬화해 만든 비교 지문. 멱등성 payload 불일치 탐지에 사용한다. | `apps/game-server/src/application/services/game-command.service.ts` |
| replayed result | 같은 idempotency key + 같은 fingerprint 재요청 시 기존 성공 결과를 재응답하는 처리 결과. | `apps/game-server/src/application/services/game-command.service.ts` |
| Version Conflict | `expectedVersion !== actualVersion`일 때 발생하는 충돌 판정. | `apps/game-server/src/application/policies/version-conflict.policy.ts` |
| POLICY_VIOLATION | 룰 엔진이 정책 위반을 반환한 경우의 서버 거절 분류. | `apps/game-server/src/application/services/game-command.service.ts` |
| mapSnapshotToGameState | Firestore 스냅샷을 `GameState`로 매핑하며 `finalRound` 누락 시 `false`로 보정하는 매퍼. | `packages/infra-firestore/src/mappers/game.mapper.ts` |

## 5. 품질/테스트/문서 운영 용어

| 용어 | 정의 | 관련 위치 |
| --- | --- | --- |
| Determinism Test | 동일 입력에서 동일 결과를 보장하는 테스트 집합. | `packages/rule-engine/tests/determinism/*.spec.ts` |
| Scenario Fixture | 규칙/서버 동작을 재현 가능한 입력 상태와 명령 시퀀스로 고정한 테스트 자산. | `packages/test-fixtures/src/scenarios/**/*.ts` |
| RULE_ENGINE 시나리오 | 룰 엔진 상태전이/정책에 초점을 둔 시나리오 레이어. | `packages/test-fixtures/src/scenarios/scenario.types.ts` |
| GAME_SERVER 시나리오 | 멱등성/버전충돌 등 서버 오케스트레이션에 초점을 둔 시나리오 레이어. | `packages/test-fixtures/src/scenarios/scenario.types.ts` |
| Quality Score | 아키텍처 경계, 타입 안정성, 테스트 신뢰도 등 5개 축으로 품질 상태를 수치화한 문서. | `docs/quality/QUALITY_SCORE.md` |
| Agent Harness | 디자인 문서 -> 실행 계획 -> 구현 -> 검증 -> 완료 기록의 에이전트 작업 루프 규칙. | `docs/agent-harness.md` |
| Design Doc | 배경/목표/비목표/대안/리스크를 담는 설계 문서 단위. | `docs/design-docs/*.md` |
| Exec Plan | 파일 단위 작업 범위, 단계, 검증/롤백을 기록하는 실행 계획 문서 단위. | `docs/exec-plans/**/*.md` |
| Scaffolding | 레이어/경계만 우선 고정하고 구현은 최소화한 초기 골격 상태. 빈 파일/최소 타입이 이에 해당한다. | `docs/implementation-architecture-visualization.md` |

