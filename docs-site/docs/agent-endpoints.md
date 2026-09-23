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
  machine-readable page index: title, description, route `path`,
  canonical URL, and markdown URL per page, plus any
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

## Well-known files

Tools that auto-configure probe `/.well-known/` before they read any page.
Every build writes two files there:

- **[`/.well-known/agent-skills/index.json`](pathname:///pokedocs/.well-known/agent-skills/index.json)**
  follows the [agent-skills discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc)
  v0.2.0. It lists one skill that teaches an agent how to read this site,
  with a `sha256:` digest of the skill file that clients check before
  using it.
- **[`/.well-known/agent-skills/pokedocs/SKILL.md`](pathname:///pokedocs/.well-known/agent-skills/pokedocs/SKILL.md)**
  is that skill: when to use it, the fetch order (`llms.txt`, then a page's
  `.md`, then `llms-full.txt` for broad tasks), and the page list. Sites
  with more than 50 pages leave the list to `llms.txt`.
- **[`/.well-known/pokedocs.json`](pathname:///pokedocs/.well-known/pokedocs.json)**
  is the site manifest: the absolute URL of every agent artifact, in one
  fetch.

| `pokedocs.json` field | Meaning |
|---|---|
| `pokedocs` | Format version, currently `1`. Bumped when a field moves or changes meaning. |
| `generator` | The plugin and version that wrote the file. |
| `site` | `title`, `tagline` (when set), and the root `url` including `baseUrl`. |
| `pages` | Number of pages on the agent surface (`ingest: false` pages excluded). |
| `artifacts` | Absolute URLs: `llmsTxt`, `llmsFullTxt`, `pagesJson`, `agentSkills` (when the skill is on), plus the `markdownTwins` URL rule. |

The skill's name defaults to a slug of the site title, and its description
is generated from the title and tagline. Both are configurable, and a
hand-written `static/.well-known/agent-skills/<name>/SKILL.md` replaces
the generated file outright. The index then takes its description from
that file's frontmatter, so the two always agree:

```ts title="docusaurus.config.ts"
agentEndpoints: {
  agentSkill: {
    name: 'acme-api',
    description: 'Use when calling the Acme REST API or debugging its errors.',
  },
  // agentSkill: false skips the skill; pokedocs.json is still written
},
```

:::note[Sites under a sub-path]

`.well-known` is defined at the host root, so a client probing
`https://example.github.io/.well-known/` will not find a site served from
`/pokedocs/`. The files are still emitted under your `baseUrl` and linked
from `pokedocs.json`; a site on its own domain or at `baseUrl: '/'` gets
host-root discovery with no extra work.

:::

PokeDocs deliberately emits no A2A `agent-card.json` and no MCP
`server-card.json`: both advertise a live endpoint, and a static site has
none. The MCP card arrives with the MCP server itself.

## Excluding a page

Set `ingest: false` in a page's frontmatter and it disappears from the
index, the corpus, and the twins. Drafts and unlisted pages are excluded
automatically. The field name is configurable:

```ts title="docusaurus.config.ts"
presets: [
  ['@pokedocs/preset', {
    agentEndpoints: {
      excludeField: 'ingest', // the default
      // llmsTxt / markdownTwins / discoveryLinks / indexPointer / agentSkill: false to disable pieces
    },
  }],
]
```

Like everything in the preset, it is on by default — `agentEndpoints:
false` turns the whole surface off.
