import { assertLocalAuthGuard } from "../../src/lib/local-auth";
import { LobbyClient } from "../../src/presentation/lobby/LobbyClient";

export default async function LobbyPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  assertLocalAuthGuard();

  const params = await searchParams;
  const initialUserId = params.userId?.trim() || "player-1";

  return <LobbyClient initialUserId={initialUserId} />;
}
