---
sidebar_position: 4
description: PokeDocs roadmap — six milestones from foundation to v1.0, tracked as GitHub milestones and story issues.
---

# Roadmap

Strictly ordered milestones; versions cut at milestone completion. Live progress on the [GitHub milestones page](https://github.com/wbaxterh/pokedocs/milestones).

| Version | Milestone | Theme |
|---|---|---|
| v0.0.x | **M0 — Foundation** 🚧 | Monorepo, CI, AI-reviewed PRs, changesets, this site |
| v0.1 | M1 — MVP: `create-pokedocs` | Branded, diagram-native, agent-readable site in under 10 minutes |
| v0.2 | M2 — Quality gates | `pokedocs check` + frontmatter schemas |
| v0.3 | M3 — Agent-native depth | Page actions, discovery files, MCP, upstream markdown-emission PR |
| v0.4 | M4 — Docs-drift CI | PR-triggered doc updates, deterministic code-coupling |
| v1.0 | M5 — Polish & launch | Mermaid interactions, PDF export, migration codemod |

## The MVP bar

`npx create-pokedocs my-docs` → a deployed site in under 10 minutes where:

- mermaid diagrams are **in the HTML** (SVG + preserved source), not rendered client-side
- `llms.txt`, `llms-full.txt`, and per-page `.md` twins exist as static files
- search works offline with zero signup
- the brand came from one config line

The dogfood gate: the author's own product docs sites migrate to PokeDocs before v0.1 ships.
