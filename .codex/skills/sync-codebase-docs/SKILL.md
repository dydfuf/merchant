---
name: sync-codebase-docs
description: Inspect a repository and synchronize project documentation with the actual codebase state. Use when apps/packages are added or removed, architecture boundaries change, lint/test pipelines are updated, or the user asks to review and update README, architecture, harness, concern-boundary, or quality documents.
---

# Sync Codebase Docs

## Overview

Use this skill to align documentation with the current repository state.
Prioritize architecture and process docs over feature prose, and update only what is out of sync.

## Workflow

1. Build a codebase snapshot.
- Run `scripts/scan-codebase.sh <repo-root>`.
- Confirm current app/package directories, tooling files, and markdown path references.

2. Identify documentation drift.
- Detect stale references to deleted or renamed paths.
- Detect missing references for newly added structural elements.
- Load `references/doc-sync-checklist.md` for target docs and update rules.

3. Apply focused document updates.
- Update only files that are inconsistent with the snapshot.
- Keep statements factual: distinguish implemented vs planned.
- Use concrete dates when recording status changes.

4. Validate consistency.
- Re-run `scripts/scan-codebase.sh <repo-root>` and ensure no missing path references remain in docs.
- Run project checks if available (`lint`, `check-types`, `test`) and record failures if any.

5. Report outcomes.
- List changed files and why each changed.
- Call out unresolved gaps explicitly.

## Update Priorities

When these files exist, update in this order:

1. `ARCHITECTURE.md`
2. `docs/concerns-and-boundaries.md`
3. `docs/agent-harness.md`
4. `README.md`
5. `docs/quality/QUALITY_SCORE.md`
6. Related design docs under `docs/design-docs/`

## Rules

- Prefer minimal edits that restore correctness.
- Do not invent components, tests, pipelines, or operational guarantees.
- Remove references to paths that no longer exist.
- Keep terminology consistent across architecture, harness, and boundary docs.
- Preserve intentional roadmap sections, but clearly label them as planned.

## Resources

- `scripts/scan-codebase.sh`
Purpose: Generate a deterministic snapshot of repo structure and report markdown references to missing `apps/*` or `packages/*` paths.

- `references/doc-sync-checklist.md`
Purpose: Document-by-document checklist for what to verify and update.
