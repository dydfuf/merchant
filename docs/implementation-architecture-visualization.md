# Implementation Architecture Visualization

기준일: 2026-02-13

이 문서는 현재 `merchant` 레포의 **구현 기준 아키텍처(스캐폴딩 포함)**를 시각화한다.
실제 코드 구현 여부와 무관하게, 현재 고정된 경계/의존 흐름을 보여준다.

## 1) Runtime Flow (Command -> Event/Snapshot)

```mermaid
flowchart LR
  U["Player"] --> W["apps/web (Next.js)"]
  W --> P["apps/game-server presentation (HTTP/WS)"]
  P --> A["apps/game-server application services"]
  A --> R["packages/rule-engine"]
  A --> I["packages/infra-firestore"]
  I --> S[("Storage (InMemory | Firestore)")]
  S --> W
```

## 2) Monorepo Package Dependency View

```mermaid
flowchart TB
  subgraph Apps
    WEB["apps/web"]
    GS["apps/game-server"]
  end

  subgraph Packages
    UI["packages/ui"]
    ST["packages/shared-types"]
    RE["packages/rule-engine"]
    IF["packages/infra-firestore"]
    TF["packages/test-fixtures"]
  end

  WEB --> UI
  GS --> RE
  GS --> IF
  GS --> ST
  RE --> ST
  IF --> ST
  TF --> RE
  TF --> ST
```

## 3) `apps/game-server` Layer Boundary

```mermaid
flowchart LR
  subgraph Presentation["presentation layer"]
    HTTP["http/health"]
    WS["ws/game.gateway"]
    RT["runtime/local-server"]
  end

  subgraph Application["application layer"]
    SVC["services"]
    CMD["commands"]
    POL["policies"]
  end

  subgraph Infrastructure["infrastructure layer"]
    AUTH["auth"]
    LOG["logger"]
  end

  HTTP --> SVC
  WS --> SVC
  RT --> WS
  RT --> HTTP
  SVC --> CMD
  SVC --> POL
  SVC --> AUTH
  SVC --> LOG
  SVC -. "via port" .-> EXT["packages/infra-firestore"]
```

## 4) Command Handling Sequence

```mermaid
sequenceDiagram
  participant Player
  participant Web as apps/web
  participant Gateway as game-server presentation
  participant App as game-server application
  participant Rule as rule-engine
  participant Infra as infra-firestore
  participant DB as Storage (InMemory or Firestore)

  Player->>Web: Input action
  Web->>Gateway: Send Command
  Gateway->>App: Dispatch command
  App->>App: Idempotency check
  App->>App: Version conflict check
  App->>Rule: Validate/apply rules
  App->>Infra: Persist event + snapshot
  Infra->>DB: Transaction write (events + snapshot)
  DB-->>Web: Realtime update
```

## 5) Splendor Domain Slice (Rule Engine)

```mermaid
flowchart TB
  subgraph Domain["packages/rule-engine/src/domain"]
    L["lobby"]
    M["match"]
    T["turn"]
    E["economy"]
    C["card-market"]
    N["nobles"]
    S["scoring"]
  end

  APP["application (validate/apply)"] --> L
  APP --> M
  APP --> T
  APP --> E
  APP --> C
  APP --> N
  APP --> S
```

## 6) Shared Types Coverage (Phase 1 중심)

```mermaid
flowchart LR
  CMD["command/*"]
  EVT["event/*"]
  ST["state/*"]

  CMD --> C1["TAKE_TOKENS"]
  CMD --> C2["BUY_CARD"]
  CMD --> C3["RESERVE_CARD"]
  CMD --> C4["END_TURN"]

  EVT --> E1["TOKENS_TAKEN"]
  EVT --> E2["CARD_BOUGHT"]
  EVT --> E3["CARD_RESERVED"]
  EVT --> E4["TURN_ENDED"]
  EVT --> E5["GAME_ENDED"]

  ST --> S1["GameState"]
  ST --> S2["BoardState"]
  ST --> S3["PlayerState"]
```

## 7) Notes

- 로컬 개발 경로에서는 `packages/infra-firestore`의 InMemory Registry를 사용한다.
- Firestore 저장소 구현 경계는 `packages/infra-firestore` 단일 위치로 유지한다.
- `apps/game-server`의 `application`/`presentation`은 ESLint로 infra 직접 import를 제한한다.
