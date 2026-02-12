export * from "./builders/game-state.builder.js";
export * from "./builders/command.builder.js";
export * from "./seeds/splendor.seed.js";
export * from "./scenarios/scenario.types.js";

export * from "./scenarios/two-player/basic-flow.fixture.js";
export * from "./scenarios/two-player/idempotency.fixture.js";
export * from "./scenarios/two-player/version-conflict.fixture.js";
export * from "./scenarios/two-player/final-round-tiebreak.fixture.js";
export * from "./scenarios/three-player/noble-double-eligibility.fixture.js";
export * from "./scenarios/four-player/token-limit-return.fixture.js";

import { tokenLimitReturnFixture } from "./scenarios/four-player/token-limit-return.fixture.js";
import { nobleDoubleEligibilityFixture } from "./scenarios/three-player/noble-double-eligibility.fixture.js";
import type { SplendorScenario } from "./scenarios/scenario.types.js";
import { basicTwoPlayerFlowFixture } from "./scenarios/two-player/basic-flow.fixture.js";
import { finalRoundTieBreakFixture } from "./scenarios/two-player/final-round-tiebreak.fixture.js";
import { idempotencyFixture } from "./scenarios/two-player/idempotency.fixture.js";
import { versionConflictFixture } from "./scenarios/two-player/version-conflict.fixture.js";

export const allSplendorScenarios: readonly SplendorScenario[] = [
  basicTwoPlayerFlowFixture,
  finalRoundTieBreakFixture,
  nobleDoubleEligibilityFixture,
  tokenLimitReturnFixture,
  idempotencyFixture,
  versionConflictFixture,
];

export const ruleEngineScenarios = allSplendorScenarios.filter(
  (scenario) => scenario.layer === "RULE_ENGINE",
);

export const gameServerScenarios = allSplendorScenarios.filter(
  (scenario) => scenario.layer === "GAME_SERVER",
);
