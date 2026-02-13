import type { IncomingMessage } from "node:http";

export function isHealthRoute(request: IncomingMessage): boolean {
  if (request.method !== "GET") {
    return false;
  }

  const pathname = toPathname(request.url);
  return pathname === "/health";
}

function toPathname(rawUrl: string | undefined): string {
  if (!rawUrl || rawUrl.length === 0) {
    return "/";
  }

  const url = new URL(rawUrl, "http://localhost");
  return url.pathname;
}
