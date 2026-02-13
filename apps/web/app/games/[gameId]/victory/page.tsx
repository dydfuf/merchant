import { VictorySummary } from "../../../../src/presentation/victory/VictorySummary";

export default async function VictoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { gameId } = await params;
  const query = await searchParams;
  const userId = query.userId?.trim() || "player-1";

  return <VictorySummary gameId={gameId} userId={userId} />;
}
