import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@repo/infra-firestore", "@repo/infra-firestore/*"],
              message:
                "apps/web must not import infra-firestore directly. Use game-server APIs.",
            },
            {
              group: ["@headlessui/*"],
              message:
                "Headless interaction primitives must use Base UI wrappers from @repo/ui.",
            },
            {
              group: ["@radix-ui/*"],
              message:
                "Headless interaction primitives must use Base UI wrappers from @repo/ui.",
            },
          ],
        },
      ],
    },
  },
];
