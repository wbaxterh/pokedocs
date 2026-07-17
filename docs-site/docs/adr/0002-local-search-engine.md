---
sidebar_position: 2
description: "ADR-0002: @easyops-cn/docusaurus-search-local is the default search engine for @pokedocs/preset, with Pagefind as the documented large-corpus escape hatch — benchmarked head-to-head on a 68-page corpus."
---

# ADR-0002: Local search engine

**Status:** Accepted · **Story:** S1.6.2 · **Date:** 2026-07-17

## Context

F1.6 ships working offline full-text search **by default** — zero signup, pure static hosting, wired automatically by `@pokedocs/preset`. Two engines were benchmarked in an isolated worktree on a 68-page corpus (Docusaurus 3.10.2, interleaved cold builds with all caches cleared, queries executed in a served browser via Playwright).

## Benchmark

| | **@easyops-cn/docusaurus-search-local 0.55.2** | Pagefind 1.5.2 |
|---|---|---|
| Build time added (vs 3.9 s baseline) | **+0.4 s** | +0.6 s (true indexing 0.04–0.07 s; rest is npx overhead) |
| Index on disk | 836 KB | 984 KB (all UI flavors; per-reader subset smaller) |
| Reader payload | 929 KB raw / **152 KB gzip** — grows linearly with corpus | ~130 KB gzip **constant** (UI at load + core/WASM on first query) |
| Query quality (5 probes: exact, partial, heading, code token, phrase) | **5/5** | **5/5** |
| Works in `docusaurus start` dev | ✅ identical to prod | ✗ dead search box (index only exists post-build) |
| Integration | **One `themes[]` entry** — nothing else | Post-build index step + custom ~70-line SearchBar override + `baseUrl` fixup for non-root paths |
| Maintenance | Published 6 weeks before test; Docusaurus 2/3 + React 16–19 peers, verified on 3.10.2 | Very active (CloudCannon-backed); framework-agnostic — indexes final HTML, immune to Docusaurus majors |

## Decision

**`@easyops-cn/docusaurus-search-local` is the F1.6 default.** Both engines cleared every gate (static hosting, 3.10 compat, 5/5 quality, negligible build cost) — so the decision falls to F1.6's core constraint: *wired by default, automatably, with no broken states*. easyops wins decisively: one `themes[]` entry the preset already knows how to inject, identical behavior in dev and prod, no post-build step, no custom components.

**Pagefind is the documented escape hatch** — reserved as a `search: { engine: 'pagefind' }` preset option for corpora beyond a few hundred pages, where its constant ~130 KB gzip payload beats easyops' linearly-growing index (already 152 KB gzip at 68 pages). Its dev-server gap and SearchBar override become acceptable trade-offs at that scale, and the integration cost lands on us once, in the preset, not on users.

## Consequences

- `@pokedocs/preset` types now carry `SearchEngine = 'local' | 'pagefind'` with `'local'` as default; the pagefind path is a later, additive implementation.
- `docsRouteBasePath` must match the preset's `routeBasePath: '/'` or pages silently don't index — preset wiring owns this so users can't get it wrong.
- Nothing loads until the reader focuses the search box, so default page-load performance is unaffected.
- Revisit trigger: if a dogfood-scale corpus pushes the easyops gzip payload past ~300 KB, promote pagefind to default for large sites.
