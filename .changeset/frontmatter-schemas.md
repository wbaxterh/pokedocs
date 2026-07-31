---
'@pokedocs/plugin-frontmatter-schema': minor
'@pokedocs/plugin-agent-endpoints': minor
'@pokedocs/preset': minor
'create-pokedocs': minor
'pokedocs': patch
---

Frontmatter contracts (S2.2.1/S2.2.2): declare schemas in config — per directory or glob, with required/string/number/boolean/date/enum fields — and violations fail the build before rendering, all at once, with file, field, and expected shape. Fields marked `index: true` flow into the agent surface: appended to `llms.txt` entries and emitted in the new `/pages.json`, a stable machine-readable page index (title, description, url, markdownUrl, fields). The preset wires it all by default (permissive with zero config); scaffolded sites now enforce `description` on every page — the convention AGENTS.md documents, made real. Also fixes a `pokedocs check` false positive on mermaid's `[(database)]` cylinder shape.
