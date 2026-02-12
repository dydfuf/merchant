export interface VersionConflictInput {
  expectedVersion: number;
  actualVersion: number;
}

export type VersionConflictDecision = "accept" | "reject_conflict";

export function evaluateVersionConflict(
  input: VersionConflictInput,
): VersionConflictDecision {
  return input.expectedVersion === input.actualVersion
    ? "accept"
    : "reject_conflict";
}

export function isVersionConflict(input: VersionConflictInput): boolean {
  return evaluateVersionConflict(input) === "reject_conflict";
}
