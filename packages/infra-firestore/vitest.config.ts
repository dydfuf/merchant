import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: "infra-firestore",
      environment: "node",
      passWithNoTests: true,
      include: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "tests/**/*.{test,spec}.{ts,tsx}",
      ],
    },
  }),
);
