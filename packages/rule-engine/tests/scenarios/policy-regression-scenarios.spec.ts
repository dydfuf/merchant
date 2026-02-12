import type { TakeTokensCommand } from "@repo/shared-types";
import { describe, expect, it } from "vitest";

import { applyCommand } from "../../src/application/apply-command.js";
import { resolveGameWinners } from "../../src/domain/scoring/scoring.policy.js";
import {
  createGameState,
  createPlayer,
  createPlayers,
  createTokenWallet,
} from "../helpers/state.factory.js";

describe("정책 회귀 시나리오", () => {
  it("불필요한 토큰 반납은 명령 적용 단계에서 거부된다", () => {
    const state = createGameState({
      players: createPlayers(
        createPlayer("p1", {
          tokens: createTokenWallet({
            diamond: 1,
            sapphire: 1,
            emerald: 1,
            ruby: 1,
            onyx: 1,
            gold: 2,
          }),
        }),
        createPlayer("p2"),
      ),
      currentPlayerId: "p1",
    });

    const command: TakeTokensCommand = {
      type: "TAKE_TOKENS",
      gameId: state.gameId,
      actorId: "p1",
      expectedVersion: state.version,
      idempotencyKey: "scenario-unnecessary-return",
      payload: {
        tokens: { diamond: 1, sapphire: 1, emerald: 1 },
        returnedTokens: { ruby: 1 },
      },
    };

    const result = applyCommand({
      state,
      command,
      playerOrder: ["p1", "p2"],
      deckCardIdsByTier: {},
    });

    expect(result).toEqual({
      ok: false,
      code: "POLICY_VIOLATION",
      policyCode: "ECONOMY_UNNECESSARY_TOKEN_RETURN",
      reason: undefined,
    });
  });

  it("부분 최종 점수맵은 승자 계산에서 거부된다", () => {
    const state = createGameState({
      players: createPlayers(createPlayer("p1"), createPlayer("p2")),
    });

    const result = resolveGameWinners(state, {
      p1: 15,
    });

    expect(result).toEqual({
      ok: false,
      code: "SCORING_FINAL_SCORES_INVALID",
    });
  });
});

