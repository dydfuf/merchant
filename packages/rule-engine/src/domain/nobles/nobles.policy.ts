import type { GameState, NobleId, PlayerBonusWallet } from "@repo/shared-types";

import { NOBLE_TILES } from "./noble.catalog.js";
import {
  policyFailure,
  policySuccess,
  type PolicyResult,
} from "../policy-error-code.js";

const GEM_COLORS = ["diamond", "sapphire", "emerald", "ruby", "onyx"] as const;

const NOBLE_BY_ID = new Map(NOBLE_TILES.map((tile) => [tile.id, tile] as const));

export interface NobleVisitPolicyValue {
  eligibleNobleIds: NobleId[];
  grantedNobleId?: NobleId;
  scoreDelta: number;
}

export function evaluateNobleVisit(
  state: GameState,
  actorId: string,
): PolicyResult<NobleVisitPolicyValue> {
  const player = state.players[actorId];
  if (!player) {
    return policyFailure("NOBLE_PLAYER_NOT_FOUND");
  }

  const eligibleNobleIds: NobleId[] = [];
  for (const nobleId of state.board.openNobleIds) {
    const noble = NOBLE_BY_ID.get(nobleId);
    if (!noble) {
      return policyFailure("NOBLE_TILE_NOT_FOUND");
    }

    if (isEligibleForNoble(player.bonuses, noble.requirement)) {
      eligibleNobleIds.push(noble.id);
    }
  }

  eligibleNobleIds.sort((left, right) => left.localeCompare(right));
  const grantedNobleId = eligibleNobleIds[0];

  return policySuccess({
    eligibleNobleIds,
    grantedNobleId,
    scoreDelta: grantedNobleId ? 3 : 0,
  });
}

export function isEligibleForNoble(
  bonuses: PlayerBonusWallet,
  requirement: Record<(typeof GEM_COLORS)[number], number>,
): boolean {
  for (const color of GEM_COLORS) {
    if (bonuses[color] < requirement[color]) {
      return false;
    }
  }
  return true;
}
