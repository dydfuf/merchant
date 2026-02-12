import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/web/vitest.config.ts",
  "apps/game-server/vitest.config.ts",
  "packages/ui/vitest.config.ts",
  "packages/shared-types/vitest.config.ts",
  "packages/rule-engine/vitest.config.ts",
  "packages/infra-firestore/vitest.config.ts",
  "packages/test-fixtures/vitest.config.ts",
]);
