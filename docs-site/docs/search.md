---
sidebar_position: 4
slug: /local-search
description: Full-text search works out of the box with zero signup — a local index built at build time, served statically, active in dev and prod. Algolia remains available as an opt-in upgrade.
---

# Search

Search works the moment you scaffold a site: no service to sign up for, no
API key, no index to host. `@pokedocs/preset` bundles and activates
[`@easyops-cn/docusaurus-search-local`](https://github.com/easyops-cn/docusaurus-search-local)
— the index is built during `docusaurus build`, ships as static files, and
the search UI inherits your [branding](./branding.md). It behaves
identically in `docusaurus start` and production, and works offline.

The engine choice is the outcome of a head-to-head benchmark recorded in
[ADR-0002](./adr/0002-local-search-engine.md). Try it now — the search box
in this site's navbar is the default wiring, untouched.

## Options

```ts title="docusaurus.config.ts"
presets: [
  ['@pokedocs/preset', {
    search: true,                  // the default — omit it entirely
    // search: false,              // opt out
    // search: { engine: 'local' } // explicit default engine
  }],
]
```

`{ engine: 'pagefind' }` is reserved as the large-corpus escape hatch per
ADR-0002 (constant-size payload as page count grows); it is not implemented
yet, and the preset says so rather than silently falling back.

## Upgrading to Algolia

For very large sites or typo-tolerant ranked search, [Algolia
DocSearch](https://docsearch.algolia.com/) (free for open-source docs)
remains a fully supported opt-in upgrade — it is the one search setup that
*requires* an external service, which is why it is not the default:

```ts title="docusaurus.config.ts"
presets: [
  ['@pokedocs/preset', { search: false }],
]
themeConfig: {
  algolia: {
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_SEARCH_ONLY_API_KEY', // public search-only key, not an admin key
    indexName: 'YOUR_INDEX',
  },
}
```

Then add `@docusaurus/theme-search-algolia` to `themes` per the [Docusaurus
search docs](https://docusaurus.io/docs/search#using-algolia-docsearch).
