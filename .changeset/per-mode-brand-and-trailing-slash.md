---
'@pokedocs/theme': minor
'@pokedocs/preset': minor
'@pokedocs/plugin-agent-endpoints': patch
---

Per-mode brand colors (S1.4.3, found migrating TrickBook's yellow brand): `brandColor` now accepts `{ light, dark }` for brands where one color can't serve both modes — the explicit dark primary is respected but still AA-lifted against the dark background when needed; single-string behavior is byte-identical to before. The preset validator covers the union. Also fixes discovery-link injection under `trailingSlash: false`, where Docusaurus emits flat `page.html` files instead of `page/index.html`.
