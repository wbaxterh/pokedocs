---
'@pokedocs/preset': minor
---

The preset is real (S1.2.1/S1.2.2/S1.6.1): one `@pokedocs/preset` entry wraps the classic preset docs-first (`routeBasePath: '/'`, blog off) and activates every implemented capability — build-time mermaid, compiled branding (stylesheet, favicon, and font injection), and zero-signup local search per ADR-0002 — each disabled by a single option. Options are schema-validated at build start with errors that name the bad key, suggest the nearest known one, and show the expected shape with an example.
