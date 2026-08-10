---
"pokedocs": patch
---

`check`: stop stripping date- and version-like filename prefixes when deriving doc ids.

`docIdFor` stripped any leading `\d+[-_. ]`, so `reports/2026-08-07-tag-gateway.md`
resolved to `reports/08-07-tag-gateway`. A page named that way was reported as **both**
a `dangling-sidebar-entry` error and an `orphaned-page` warning at the same time, while
Docusaurus built and served it correctly — a hard failure of `pokedocs check` on a page
that works.

Number-prefix parsing now mirrors Docusaurus's `DefaultNumberPrefixParser`, including
its `ignoredPrefixPattern` for date-like (`2026-08-…`) and version-like (`7.0-…`)
prefixes, and its requirement that the suffix not begin with a separator.
