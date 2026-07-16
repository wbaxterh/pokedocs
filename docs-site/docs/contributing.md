---
sidebar_position: 3
description: How to contribute to PokeDocs — one story, one PR. Build commands, workflow, and how the AI review agents fit in.
---

# Contributing

PokeDocs is built story by story from the [PRD](https://github.com/wbaxterh/pokedocs/blob/main/docs/prd/pokedocs-prd-v1.md). Every user story is a GitHub issue titled `[S<id>] <title>`; its acceptance criteria are the definition of done.

## Build & test

```bash
pnpm install          # workspace install (pnpm 10, Node >= 20)
pnpm build            # builds every package topologically
pnpm test             # vitest unit tests
pnpm lint             # biome check
```

## Workflow: one story = one PR

1. Pick an open story issue (respect milestone order — M0 before M1).
2. Branch from `main`: `feature/s<id>-short-name`.
3. Implement; verify the acceptance criteria literally.
4. Commit with `Fixes #<n>`; open a PR.
5. CI (lint, build, test) must pass — it's a required check.
6. Two AI agents review every non-draft PR: a **reviewer** (conventions + acceptance criteria) and a **breaker** (adversarial testing). Address or explicitly dismiss their findings.
7. Squash-merge.

If your change alters published package behavior, add a changeset (`pnpm changeset`) — releases are automated from merged changesets.

The repo's `AGENTS.md` is the complete orientation for coding agents (and humans in a hurry).
