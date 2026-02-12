export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export function createConsoleLogger(scope = "game-server"): Logger {
  return {
    info: (message, context) => log("INFO", scope, message, context),
    warn: (message, context) => log("WARN", scope, message, context),
    error: (message, context) => log("ERROR", scope, message, context),
  };
}

function log(
  level: "INFO" | "WARN" | "ERROR",
  scope: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (context && Object.keys(context).length > 0) {
    console.log(`[${level}] [${scope}] ${message}`, context);
    return;
  }

  console.log(`[${level}] [${scope}] ${message}`);
}
