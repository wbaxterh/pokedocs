---
'@pokedocs/plugin-agent-endpoints': minor
'@pokedocs/preset': minor
---

Agent endpoints v1 (S1.5.1–S1.5.3): every build now emits the static agent surface — `/llms.txt` (llmstxt.org index with titles, descriptions, and markdown URLs), `/llms-full.txt` (the whole corpus in one fetch, code fences and mermaid sources verbatim), and a `.md` twin beside every HTML page at the same path. Each page's HTML head links its twin and the site index via `<link rel="alternate">`, so any entry URL discovers the machine-readable surface. `ingest: false` frontmatter (field configurable) excludes a page from all artifacts; drafts and unlisted pages are excluded automatically. The preset activates all of it by default; `agentEndpoints: false` or per-piece flags disable. Also fixes the `/search` route collision between the search docs page and the search-local results page.
