import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      "react/prop-types": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@headlessui/*"],
              message: "Use Base UI primitives only.",
            },
            {
              group: ["@radix-ui/*"],
              message: "Use Base UI primitives only.",
            },
          ],
        },
      ],
    },
  },
];
