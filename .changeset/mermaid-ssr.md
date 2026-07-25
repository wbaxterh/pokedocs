---
'@pokedocs/plugin-mermaid-ssr': minor
---

Build-time mermaid (S1.3.1–S1.3.3, shipped in #61): `rehypeMermaidSsr` compiles every mermaid fence to inline SVG during the build with the diagram source preserved in `data-mermaid-source` for agents, and fails the build with file/line/caret diagnostics on invalid syntax. One shared transformer across all files; the ESM-only engine loads via a dynamic import deferred to transform time.
