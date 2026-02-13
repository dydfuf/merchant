import GameScreenClient from "../../../src/presentation/game/GameScreenClient";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { gameId } = await params;
  const query = await searchParams;

  return (
    <GameScreenClient
      gameId={gameId}
      initialUserId={query.userId?.trim() || "player-1"}
    />
  );
}
