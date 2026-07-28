---
slug: /
sidebar_position: 1
description: PokeDocs is an open-source, agent-native documentation framework built as a distribution on top of Docusaurus — diagram-native, branded in one line, drift-aware, agent-readable, host-anywhere.
---

# PokeDocs

**Docs that humans love — and agents can actually read. Built in minutes, hosted anywhere.**

PokeDocs is an open-source, agent-native documentation framework built as a **distribution on top of [Docusaurus](https://docusaurus.io)**. Everything a modern docs site needs, on by default:

1. **Diagram-native** — mermaid rendered to SVG at build time, source preserved for agents, syntax errors fail the build
2. **[Branded in one line](./branding.md)** — `brandColor` + logo in config → a complete, contrast-checked theme
3. **Drift-aware** — shipped CI that checks whether code changes need doc changes
4. **[Agent-readable by default](./agent-endpoints.md)** — `llms.txt`, `llms-full.txt`, per-page `.md` twins, MCP-ready discovery, all as static files
5. **[Host anywhere](./hosting.md)** — GitHub Pages, Vercel, Netlify, Docker/nginx — no vendor, no server, no lock-in

## Why

Documentation now has two audiences: humans and AI agents. Hosted platforms made agent-readability table stakes but lock you to their infrastructure; open-source frameworks haven't caught up. PokeDocs delivers the hosted-platform agent experience as **pure static build artifacts**.

The full argument, with evidence, lives in the [PRD](https://github.com/wbaxterh/pokedocs/blob/main/docs/prd/pokedocs-prd-v1.md).

## Status

🚧 **Building milestone M1 (MVP core).** This site is the dogfood: everything here — the theme, the search box, the diagrams — runs through `@pokedocs/preset` exactly as scaffolded sites do. The [roadmap](/roadmap) tracks every milestone; every user story is a [GitHub issue](https://github.com/wbaxterh/pokedocs/issues).

```bash
npx create-pokedocs my-docs
```

The scaffolder generates a docs-only site — config-driven landing page, agent
authoring scaffold (`AGENTS.md`/`CLAUDE.md`), brand-colored logo, optional
GitHub Pages workflow — and CI proves the generated site builds clean on
every commit. First npm release is imminent; until then the packages run
from this repo.
