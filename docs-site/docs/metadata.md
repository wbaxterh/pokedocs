---
sidebar_position: 8
description: Frontmatter schemas — declare metadata contracts in config (required fields, enums, dates) and the build enforces them. Fields marked index flow into llms.txt and pages.json for retrieval pipelines.
---

# Metadata contracts

A contributing guide that says "every page needs a `description`" is a
request. A schema in config is a contract:

```ts title="docusaurus.config.ts"
presets: [
  ['@pokedocs/preset', {
    frontmatterSchema: {
      schemas: [
        {
          include: '**',
          fields: {
            description: { type: 'string', required: true },
          },
        },
        {
          include: 'adr/**',
          fields: {
            status: {
              type: 'enum',
              values: ['proposed', 'accepted', 'superseded'],
              required: true,
              index: true,
            },
            last_verified: { type: 'date' },
          },
        },
      ],
    },
  }],
]
```

Violations fail the build before anything renders, all at once, with the
file, field, and expected shape:

```
[@pokedocs/plugin-frontmatter-schema] 2 frontmatter violations:

  adr/0007-caching.md → status: expected one of "proposed" | "accepted" | "superseded", got "wip"
  guides/setup.md → description: expected a string, got missing
```

Schemas target directories or globs (`adr/**`, `reports/*.md`, `**`);
field types are `string`, `number`, `boolean`, `date`, and `enum`. Zero
config is permissive — nothing is enforced until you declare it. This
site enforces `description` on every page; so do freshly scaffolded
sites, because [agents rely on it](./agent-endpoints.md).

## Metadata flows to the agent surface

Mark a field `index: true` and its validated value is emitted wherever
agents look — appended to the page's `llms.txt` entry and included in
**`/pages.json`**, the minimal machine-readable page index:

```json
{
  "site": { "title": "Helio Documentation", "url": "https://docs.helioiot.com" },
  "pages": [
    {
      "title": "ADR-004: Event-Based Embeddings",
      "description": "Why embeddings update on events, not batches.",
      "url": "https://docs.helioiot.com/infrastructure/adr-004",
      "markdownUrl": "https://docs.helioiot.com/infrastructure/adr-004.md",
      "fields": { "status": "accepted" }
    }
  ]
}
```

`pages.json` is a stable contract: `title`, `description`, `url`,
`markdownUrl` always; `fields` when indexed metadata exists. Retrieval
pipelines can build on it — it is the seed the M3 discovery index
extends. `ingest: false` excludes a page from it, the twins, and both
llms files alike.
