export function buildGamePath(gameId: string): string {
  return `/games/${encodeURIComponent(gameId)}`;
}

export function buildGameHref(gameId: string, userId: string): string {
  const path = buildGamePath(gameId);
  const userQuery = encodeURIComponent(userId);
  return `${path}?userId=${userQuery}`;
}
