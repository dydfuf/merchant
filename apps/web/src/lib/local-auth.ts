const LOCAL_AUTH_ERROR =
  "LOCAL_AUTH_MOCK_MUST_BE_DISABLED_OUTSIDE_DEVELOPMENT";

export function resolveLocalAuthMockEnabled(raw: string | undefined): boolean {
  return raw === "true";
}

export function assertLocalAuthGuard(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  raw: string | undefined = process.env.ENABLE_LOCAL_AUTH_MOCK,
): boolean {
  const enabled = resolveLocalAuthMockEnabled(raw);

  if (nodeEnv !== "development" && enabled) {
    throw new Error(LOCAL_AUTH_ERROR);
  }

  return enabled;
}

export { LOCAL_AUTH_ERROR };
