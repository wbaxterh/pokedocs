---
sidebar_position: 5
description: Every build emits llms.txt, llms-full.txt, and a .md twin for every page — the whole site is discoverable and ingestible by agents in two fetches, as plain static files.
---

# Agent endpoints

Docs now have two audiences. Humans get the rendered site; agents get a
**machine-readable surface built from the same sources, on every build**,
as plain static files that work on any host. This site's own surface:

- **[`/llms.txt`](pathname:///pokedocs/llms.txt)** — the stable index:
  every page's title, description, and markdown URL, following
  [llmstxt.org](https://llmstxt.org) conventions. This is the entry point
  to hand an agent.
- **[`/llms-full.txt`](pathname:///pokedocs/llms-full.txt)** — the full
  corpus in one fetch, code fences and mermaid sources verbatim.
- **Markdown twins** — every HTML page has a `.md` twin at the same path:
  [`/architecture`](./architecture.md) is also
  [`/architecture.md`](pathname:///pokedocs/architecture.md). Agents
  fetch clean markdown instead of scraping hydrated HTML.

- **[`/pages.json`](pathname:///pokedocs/pages.json)** — the minimal
  machine-readable page index: title, description, canonical URL, and
  markdown URL per page, plus any
  [schema-indexed metadata](./metadata.md). A stable contract for
  retrieval pipelines.

## Discovery

Any entry URL leads to the rest of the surface: every page's HTML head
carries a `<link rel="alternate" type="text/markdown">` pointing at its
twin, and a `<link rel="alternate" type="text/plain">` pointing at
`/llms.txt`. An agent landing anywhere finds everything.

Agents usually arrive at a single twin from a search result or a pasted
link and never see the HTML head, so every twin also opens with a pointer
to the index:

```md title="/pokedocs/architecture.md"
> **Documentation index:** https://wbaxterh.github.io/pokedocs/llms.txt
> Use this file to discover all available pages before exploring further.

# Architecture
```

The pointer stays out of `llms-full.txt`, and it is skipped (with a build
warning) while the site `url` is still a placeholder, because a link to
localhost would mislead. `indexPointer: false` removes it; a string
replaces the second line.

## Excluding a page

Set `ingest: false` in a page's frontmatter and it disappears from the
index, the corpus, and the twins. Drafts and unlisted pages are excluded
automatically. The field name is configurable:

```ts title="docusaurus.config.ts"
presets: [
  ['@pokedocs/preset', {
    agentEndpoints: {
      excludeField: 'ingest', // the default
      // llmsTxt / markdownTwins / discoveryLinks / indexPointer: false to disable pieces
    },
  }],
]
```

Like everything in the preset, it is on by default — `agentEndpoints:
false` turns the whole surface off.
