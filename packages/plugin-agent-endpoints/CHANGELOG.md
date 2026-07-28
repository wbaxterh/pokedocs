# @pokedocs/plugin-agent-endpoints

## 0.1.1

### Patch Changes

- [#72](https://github.com/wbaxterh/pokedocs/pull/72) [`f6ed403`](https://github.com/wbaxterh/pokedocs/commit/f6ed4032426d9798b336c93249620095a3cc437c) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Per-mode brand colors (S1.4.3, found migrating TrickBook's yellow brand): `brandColor` now accepts `{ light, dark }` for brands where one color can't serve both modes — the explicit dark primary is respected but still AA-lifted against the dark background when needed; single-string behavior is byte-identical to before. The preset validator covers the union. Also fixes discovery-link injection under `trailingSlash: false`, where Docusaurus emits flat `page.html` files instead of `page/index.html`.

## 0.1.0

### Minor Changes

- [#68](https://github.com/wbaxterh/pokedocs/pull/68) [`a1c66f5`](https://github.com/wbaxterh/pokedocs/commit/a1c66f51dee10237c036c20936aacd87000428eb) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Agent endpoints v1 (S1.5.1–S1.5.3): every build now emits the static agent surface — `/llms.txt` (llmstxt.org index with titles, descriptions, and markdown URLs), `/llms-full.txt` (the whole corpus in one fetch, code fences and mermaid sources verbatim), and a `.md` twin beside every HTML page at the same path. Each page's HTML head links its twin and the site index via `<link rel="alternate">`, so any entry URL discovers the machine-readable surface. `ingest: false` frontmatter (field configurable) excludes a page from all artifacts; drafts and unlisted pages are excluded automatically. The preset activates all of it by default; `agentEndpoints: false` or per-piece flags disable. Also fixes the `/search` route collision between the search docs page and the search-local results page.

### Patch Changes

- [#56](https://github.com/wbaxterh/pokedocs/pull/56) [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Initial package skeletons: typed public contracts for the full PRD package map (M0).
