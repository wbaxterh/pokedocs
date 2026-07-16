# PokeDocs — Agent Guide

PokeDocs is an agent-native documentation framework built as a distribution on top of Docusaurus. You are likely here to implement a user story from the PRD. This file is the complete orientation; you should not need anything else to build and test.

## Build & test

```bash
pnpm install          # workspace install (pnpm 10, Node >= 20)
pnpm build            # tsc -b — builds every package topologically
pnpm test             # vitest run — unit tests
pnpm lint             # biome check
pnpm clean            # remove build output
```

The repo must always pass `pnpm install && pnpm build` from a clean clone. CI runs lint, build, and tests on every PR; merges are blocked on failures.

## Source of truth

- **The PRD** (`docs/prd/pokedocs-prd-v1.md`) defines everything: vision, milestones (M0–M5), features (F1.3 …), and user stories (S1.3.1 …). Read the story you're implementing before touching code.
- **GitHub issues** mirror the PRD 1:1 — one issue per story, titled `[S<id>] <title>`, milestone-assigned. Issue acceptance criteria are the definition of done.
- If you add or change stories, edit the PRD first, then re-run `python3 docs/prd/scripts/seed-github-issues.py` (idempotent — creates only new stories).

## Layout

```
packages/
  create-pokedocs/            scaffolder CLI (M1)
  pokedocs/                   CLI: check, export, deploy init, mcp
  preset/                     @pokedocs/preset — wires everything by default
  theme/                      @pokedocs/theme — branding compiler, reader components
  plugin-mermaid-ssr/         build-time mermaid → inline SVG + preserved source
  plugin-agent-endpoints/     llms.txt, .md twins, discovery links (static artifacts)
  plugin-frontmatter-schema/  declarative frontmatter validation
  actions/                    GitHub Actions workflow templates
docs/prd/                     the PRD + PDF pipeline + issue seeder
brand/                        logo SVGs
```

Each package skeleton's `src/index.ts` doc comment names the story that implements it. Public option interfaces are already pinned — extend them, don't break them.

## Conventions

- TypeScript strict, `module: NodeNext`, CJS output, built via project references (`tsconfig.build.json` at root references every package; add new packages there AND to `pnpm-workspace.yaml`).
- Root-level devDependencies for shared tooling (typescript, @types/node, biome, vitest); packages declare their own runtime deps. Workspace-internal deps use `workspace:*`.
- Unit tests live next to source as `*.test.ts`.
- Agent-readability is the product. Every doc page we ship gets frontmatter with a `description`; mermaid sources are never discarded; `ingest: false` must exclude a page from every agent artifact.

## Workflow (one story = one PR)

1. Find the issue: `gh issue list --search "[S<id>] in:title"`.
2. Branch from `main`: `feature/s<id>-short-name` (or `fix/…`).
3. Implement; verify the story's acceptance criteria literally (run the commands, don't assume).
4. Commit referencing the issue: `Fixes #<n>`.
5. PR against `main`, then `gh pr merge --squash --delete-branch` once CI is green.

## Releases

Changesets drives versioning (`.github/workflows/release.yml`). If your PR changes published package behavior, include a changeset: `pnpm changeset` (pick bump + summary; commit the generated `.changeset/*.md`). On merge to main, a "Version Packages" PR accumulates pending changesets; merging THAT publishes to npm. Publishing requires the `NPM_TOKEN` repository secret.

## PR review agents

Every non-draft PR gets two AI passes (`.github/workflows/pr-review.yml`): a **reviewer** (diff vs conventions + acceptance criteria) and a **breaker** (adversarial testing — it runs the code). Both post PR comments. They are `continue-on-error`: deterministic CI is the merge gate, the agents are extra eyes. They require the `ANTHROPIC_API_KEY` repository secret (Settings → Secrets → Actions); without it they skip silently. Address or explicitly dismiss their findings before merging.

## Gotchas

- `pnpm build` won't pick up a new package until it's referenced in `tsconfig.build.json`.
- The PDF pipeline (`docs/prd`) is independent of the workspace — it uses npm, not pnpm; regenerate the PRD PDF with `npm run generate` there after PRD edits.
- Docusaurus is a pinned upstream: don't bump its minor version casually — the dogfood site (`docs-site/`, once it lands) is the upgrade canary.
