import { buildTakeTokensCommand } from "../../builders/command.builder.js";
import {
  buildGameState,
  buildPlayerState,
  buildTokenWallet,
} from "../../builders/game-state.builder.js";

export const tokenLimitReturnFixture = {
  name: "four-player-token-limit-return",
  initialState: buildGameState({
    currentPlayerId: "player-1",
    players: {
      "player-1": buildPlayerState("player-1", {
        tokens: buildTokenWallet({
          diamond: 2,
          sapphire: 2,
          emerald: 2,
          ruby: 2,
          onyx: 1,
          gold: 0,
        }),
      }),
      "player-2": buildPlayerState("player-2"),
      "player-3": buildPlayerState("player-3"),
      "player-4": buildPlayerState("player-4"),
    },
  }),
  command: buildTakeTokensCommand(
    {
      tokens: { diamond: 1, sapphire: 1, emerald: 1 },
      returnedTokens: { ruby: 1, onyx: 1 },
    },
    {
      actorId: "player-1",
      expectedVersion: 1,
    },
  ),
};
