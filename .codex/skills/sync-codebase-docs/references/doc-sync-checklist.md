# Doc Sync Checklist

Use this checklist after scanning the repository.

## 1) ARCHITECTURE.md

- Verify app/package inventory matches real directories.
- Verify implemented guardrails are marked as implemented.
- Verify planned items are still explicitly marked as planned.
- Remove references to deleted apps/packages.

## 2) docs/concerns-and-boundaries.md

- Verify package import rule examples match real alias/path usage.
- Verify rule enforcement points (eslint configs, dependency rules) are accurate.
- Verify phased rollout notes reflect current state.

## 3) docs/agent-harness.md

- Verify quality gates match actual runnable commands.
- Verify testing workflow matches current toolchain (for example Vitest/Turbo).
- Verify "current applied status" section does not overstate coverage.

## 4) README.md

- Verify monorepo structure list matches actual directories.
- Verify command list contains only valid scripts.
- Verify high-level project status (implemented vs planned) is accurate.

## 5) docs/quality/QUALITY_SCORE.md

- Update score only when there is concrete supporting change.
- Record absolute date (`YYYY-MM-DD`).
- Keep notes evidence-based (tooling added, rules enforced, sample tests, etc.).

## 6) Cross-file consistency

- Same component should have one canonical name across files.
- If a directory is removed, remove it everywhere in docs.
- If a pipeline is added (`test`, `check-types`, `lint`), reflect it in harness and README.
