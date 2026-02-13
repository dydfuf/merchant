#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_URL="http://127.0.0.1:4010"
START_SERVER=0
KEEP_SERVER=0
TIMEOUT_SECONDS=30

print_usage() {
  cat <<'USAGE'
Usage: scripts/smoke-local-runtime.sh [options]

Options:
  --server-url <url>     Game server base URL (default: http://127.0.0.1:4010)
  --start-server         Start game-server dev process automatically
  --keep-server          Keep started server process running after smoke test
  --timeout <seconds>    Health check wait timeout in seconds (default: 30)
  -h, --help             Show this help

Examples:
  scripts/smoke-local-runtime.sh
  scripts/smoke-local-runtime.sh --start-server
  scripts/smoke-local-runtime.sh --server-url http://127.0.0.1:4010 --start-server
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-url)
      SERVER_URL="${2:-}"
      if [[ -z "$SERVER_URL" ]]; then
        echo "[ERROR] --server-url requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    --start-server)
      START_SERVER=1
      shift
      ;;
    --keep-server)
      KEEP_SERVER=1
      shift
      ;;
    --timeout)
      TIMEOUT_SECONDS="${2:-}"
      if ! [[ "$TIMEOUT_SECONDS" =~ ^[0-9]+$ ]]; then
        echo "[ERROR] --timeout requires an integer value" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown option: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

SERVER_PID=""
SERVER_LOG=""

cleanup() {
  if [[ -n "$SERVER_PID" && "$KEEP_SERVER" -eq 0 ]]; then
    if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
      echo "[INFO] Stopping started game-server process (pid=$SERVER_PID)"
      kill "$SERVER_PID" >/dev/null 2>&1 || true
      wait "$SERVER_PID" 2>/dev/null || true
    fi
  fi
}
trap cleanup EXIT INT TERM

wait_for_health() {
  local deadline
  deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))

  while [[ $(date +%s) -lt $deadline ]]; do
    if curl -sSf "$SERVER_URL/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

if [[ "$START_SERVER" -eq 1 ]]; then
  mkdir -p "$ROOT_DIR/.tmp"
  SERVER_LOG="$ROOT_DIR/.tmp/smoke-local-runtime-game-server.log"

  echo "[INFO] Starting game-server dev process"
  (
    cd "$ROOT_DIR"
    pnpm --filter game-server dev
  ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!

  if ! wait_for_health; then
    echo "[ERROR] game-server health check timed out after ${TIMEOUT_SECONDS}s" >&2
    echo "[INFO] game-server log: $SERVER_LOG" >&2
    exit 1
  fi
fi

if ! wait_for_health; then
  echo "[ERROR] Cannot reach $SERVER_URL/health" >&2
  echo "[INFO] Start server first: pnpm --filter game-server dev" >&2
  exit 1
fi

echo "[INFO] Running smoke tests against $SERVER_URL"

SMOKE_SERVER_URL="$SERVER_URL" node <<'NODE'
const serverUrl = process.env.SMOKE_SERVER_URL;

if (!serverUrl) {
  throw new Error("SMOKE_SERVER_URL is required");
}

function toWsUrl(httpUrl) {
  if (httpUrl.startsWith("https://")) {
    return `wss://${httpUrl.slice("https://".length)}`;
  }
  if (httpUrl.startsWith("http://")) {
    return `ws://${httpUrl.slice("http://".length)}`;
  }
  return `ws://${httpUrl}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${serverUrl}${path}`, options);
  const text = await response.text();

  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
    text,
  };
}

function waitForMessage(messages, predicate, timeoutMs = 3000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const matched = messages.find(predicate);
      if (matched) {
        clearInterval(timer);
        resolve(matched);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(timer);
        reject(new Error("WS_MESSAGE_TIMEOUT"));
      }
    }, 20);
  });
}

async function openSocket(url) {
  const socket = new WebSocket(url);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WS_OPEN_TIMEOUT"));
    }, 2000);

    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("WS_OPEN_ERROR"));
    });
  });

  return socket;
}

async function main() {
  const summary = [];

  const health = await request("/health");
  assert(health.status === 200, `health status expected 200, got ${health.status}`);
  assert(health.json && health.json.ok === true, "health payload missing ok=true");
  assert(health.json && health.json.mode === "local-inmemory", "health mode mismatch");
  summary.push("health:ok");

  const create = await request("/local/games", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playerIds: ["player-1", "player-2"],
      seed: "smoke-seed",
    }),
  });

  assert(create.status === 201, `create status expected 201, got ${create.status}`);
  assert(create.json && typeof create.json.gameId === "string", "create response missing gameId");

  const gameId = create.json.gameId;
  const initialVersion = create.json?.state?.version;
  assert(typeof initialVersion === "number", "create response missing state.version");
  summary.push(`create:${gameId}`);

  const wsMessages = [];
  const socket = await openSocket(`${toWsUrl(serverUrl)}/ws?userId=player-2`);
  socket.addEventListener("message", (event) => {
    try {
      wsMessages.push(JSON.parse(event.data));
    } catch {
      wsMessages.push({ type: "INVALID_JSON", raw: String(event.data) });
    }
  });

  socket.send(
    JSON.stringify({
      type: "SUBSCRIBE_GAME",
      gameId,
    }),
  );

  await waitForMessage(
    wsMessages,
    (message) => message.type === "GAME_SNAPSHOT" && message.gameId === gameId,
  );
  summary.push("ws:initial-snapshot");

  const acceptedCommand = {
    type: "TAKE_TOKENS",
    gameId,
    actorId: "player-1",
    expectedVersion: initialVersion,
    idempotencyKey: "smoke-idem-1",
    payload: {
      tokens: {
        diamond: 1,
        sapphire: 1,
        emerald: 1,
      },
    },
  };

  const accepted = await request(`/local/games/${encodeURIComponent(gameId)}/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "player-1",
    },
    body: JSON.stringify({ command: acceptedCommand }),
  });

  assert(accepted.status === 200, `accepted status expected 200, got ${accepted.status}`);
  assert(accepted.json && accepted.json.ok === true, "accepted response should be ok=true");
  assert(
    accepted.json && accepted.json.result && accepted.json.result.kind === "accepted",
    `expected accepted kind, got ${JSON.stringify(accepted.json)}`,
  );

  await waitForMessage(
    wsMessages,
    (message) =>
      message.type === "GAME_EVENTS" &&
      message.gameId === gameId &&
      Array.isArray(message.payload?.events) &&
      message.payload.events[0]?.type === "TOKENS_TAKEN",
  );

  await waitForMessage(
    wsMessages,
    (message) =>
      message.type === "GAME_SNAPSHOT" &&
      message.gameId === gameId &&
      typeof message.payload?.state?.version === "number" &&
      message.payload.state.version >= initialVersion + 1,
  );

  summary.push("command:accepted+broadcast");

  const replayed = await request(`/local/games/${encodeURIComponent(gameId)}/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "player-1",
    },
    body: JSON.stringify({ command: acceptedCommand }),
  });

  assert(replayed.status === 200, `replayed status expected 200, got ${replayed.status}`);
  assert(replayed.json && replayed.json.ok === true, "replayed response should be ok=true");
  assert(
    replayed.json && replayed.json.result && replayed.json.result.kind === "replayed",
    `expected replayed kind, got ${JSON.stringify(replayed.json)}`,
  );
  summary.push("command:replayed");

  const versionConflict = await request(
    `/local/games/${encodeURIComponent(gameId)}/commands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "player-1",
      },
      body: JSON.stringify({
        command: {
          type: "TAKE_TOKENS",
          gameId,
          actorId: "player-1",
          expectedVersion: initialVersion,
          idempotencyKey: "smoke-idem-conflict",
          payload: {
            tokens: {
              diamond: 1,
              sapphire: 1,
              emerald: 1,
            },
          },
        },
      }),
    },
  );

  assert(
    versionConflict.status === 200,
    `version conflict status expected 200, got ${versionConflict.status}`,
  );
  assert(
    versionConflict.json &&
      versionConflict.json.ok === true &&
      versionConflict.json.result?.kind === "rejected" &&
      versionConflict.json.result?.reason === "VERSION_CONFLICT",
    `expected VERSION_CONFLICT rejected, got ${JSON.stringify(versionConflict.json)}`,
  );
  summary.push("command:version-conflict");

  const unauthorized = await request(`/local/games/${encodeURIComponent(gameId)}/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "player-2",
    },
    body: JSON.stringify({
      command: {
        type: "TAKE_TOKENS",
        gameId,
        actorId: "player-1",
        expectedVersion: initialVersion + 1,
        idempotencyKey: "smoke-idem-unauthorized",
        payload: {
          tokens: {
            diamond: 1,
            sapphire: 1,
            emerald: 1,
          },
        },
      },
    }),
  });

  assert(unauthorized.status === 403, `unauthorized status expected 403, got ${unauthorized.status}`);
  assert(
    unauthorized.json &&
      unauthorized.json.ok === false &&
      unauthorized.json.reason === "UNAUTHORIZED_ACTOR",
    `expected UNAUTHORIZED_ACTOR, got ${JSON.stringify(unauthorized.json)}`,
  );
  summary.push("command:unauthorized");

  socket.close();

  console.log("[PASS] smoke-local-runtime", summary.join(" | "));
  console.log(`[INFO] gameId=${gameId}`);
  console.log("[INFO] Manual web check: open two tabs at http://localhost:3000 with player-1 / player-2 and join this gameId");
}

main().catch((error) => {
  console.error("[FAIL]", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
NODE

echo "[PASS] smoke-local-runtime.sh completed"
if [[ -n "$SERVER_LOG" ]]; then
  echo "[INFO] started server log: $SERVER_LOG"
fi
