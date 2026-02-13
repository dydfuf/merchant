export function createIdempotencyKey(prefix = "command"): string {
  const normalizedPrefix = prefix.trim().length > 0 ? prefix.trim() : "command";

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${normalizedPrefix}:${crypto.randomUUID()}`;
  }

  return `${normalizedPrefix}:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
