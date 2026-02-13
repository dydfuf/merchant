export type LobbyStatusKey = "your-turn" | "expiring" | "waiting" | "completed";

export function resolveLobbyStatusLabel(
  statusKey: LobbyStatusKey,
  statusLabel: string,
  index: number,
): string {
  if (index === 0 && statusKey === "your-turn") {
    return "내 턴";
  }

  return statusLabel;
}
