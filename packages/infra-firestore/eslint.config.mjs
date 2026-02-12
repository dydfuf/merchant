import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    files: ["src/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "next",
                "next/*",
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
              ],
              message:
                "infra-firestore must not depend on frontend frameworks.",
            },
            {
              group: ["**/presentation/**"],
              message:
                "infra-firestore is infrastructure and must not depend on presentation layer code.",
            },
          ],
        },
      ],
    },
  },
];
