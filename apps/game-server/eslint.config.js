import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "web",
                "web/*",
                "@repo/ui",
                "@repo/ui/*",
                "next",
                "next/*",
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
              ],
              message:
                "apps/game-server must not depend on frontend frameworks or UI packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/presentation/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**"],
              message:
                "presentation layer must not import infrastructure directly.",
            },
            {
              group: ["@repo/infra-firestore", "@repo/infra-firestore/*"],
              message:
                "presentation layer must not import infra packages directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/presentation/**"],
              message: "application layer must not import presentation layer.",
            },
            {
              group: [
                "**/infrastructure/**",
                "@repo/infra-firestore",
                "@repo/infra-firestore/*",
              ],
              message:
                "application layer must access infrastructure through ports, not direct imports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/presentation/**"],
              message:
                "infrastructure layer must not import presentation layer.",
            },
          ],
        },
      ],
    },
  },
];
