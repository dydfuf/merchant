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
                "@repo/rule-engine",
                "@repo/rule-engine/*",
                "@repo/infra-firestore",
                "@repo/infra-firestore/*",
              ],
              message:
                "shared-types is a foundation package and must not depend on higher layers.",
            },
            {
              group: [
                "firebase*",
                "@firebase/*",
                "next",
                "next/*",
                "react",
                "react/*",
                "react-dom",
                "react-dom/*",
              ],
              message:
                "shared-types must stay platform-neutral and free of framework/runtime dependencies.",
            },
          ],
        },
      ],
    },
  },
];
