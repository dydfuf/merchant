export interface HealthPayload {
  ok: true;
  mode: string;
  time: string;
}

export interface HealthControllerInput {
  mode: string;
  now?: () => Date;
}

export interface HealthController {
  getHealth(): HealthPayload;
}

export function createHealthController(
  input: HealthControllerInput,
): HealthController {
  const now = input.now ?? (() => new Date());

  return {
    getHealth(): HealthPayload {
      return {
        ok: true,
        mode: input.mode,
        time: now().toISOString(),
      };
    },
  };
}
