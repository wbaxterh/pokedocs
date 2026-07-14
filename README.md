<p align="center">
  <img src="brand/logo.svg" width="112" alt="PokeDocs lens logo">
</p>

<h1 align="center">PokeDocs</h1>

**Docs that humans love and agents can actually read — built in minutes, hosted anywhere.**

PokeDocs is an open-source, agent-native documentation framework built as a distribution on top of [Docusaurus](https://docusaurus.io). Everything a modern docs site needs, on by default:

- 🧜 **Diagram-native** — mermaid rendered to SVG at build time, source preserved for agents, syntax errors fail the build
- 🎨 **Branded in one line** — `brandColor` + logo in config → a complete, contrast-checked theme
- 🤖 **Agent-readable by default** — `llms.txt`, `llms-full.txt`, per-page `.md` twins, MCP-ready discovery — all static files
- 🔁 **Drift-aware** — shipped CI that checks whether code changes need doc changes
- 🔍 **Search that works** — local full-text search, zero signup
- 🚀 **Host anywhere** — GitHub Pages, Vercel, Netlify, Docker/nginx — scaffolded, footgun-free

## Status

📋 **Planning.** The build is guided by the [PRD](docs/prd/pokedocs-prd-v1.md) — start there. Milestones, features, and user stories from the PRD become this repo's GitHub issues.

## Why

Documentation now has two audiences: humans and AI agents. Hosted platforms made agent-readability table stakes but lock you in; open-source frameworks haven't caught up. PokeDocs delivers the hosted-platform agent experience as pure static build artifacts — no vendor, no server, no lock-in. The full argument, with evidence, is in the [PRD](docs/prd/pokedocs-prd-v1.md).

## Repo layout

```
brand/               logo SVGs (lens mark + badge)
docs/prd/            PRD source (markdown) + PDF pipeline
  pokedocs-prd-v1.md The spec
  scripts/           markdown → styled PDF (puppeteer + mermaid)
  output/            generated PDFs
```

## License

[MIT](LICENSE)
