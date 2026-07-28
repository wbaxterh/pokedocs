---
'pokedocs': minor
---

`pokedocs check` is live (S2.1.1–S2.1.3): the docs linter for what a green build won't catch — broken admonition titles (`:::warning Title` vs `:::warning[Title]`), unclosed admonitions and fences, MDX3 compile hazards (`<digit`, `{#custom-id}` headings under `future.v4`), unquoted mermaid label parentheses, orphaned pages, and dangling sidebar entries. Zero dependencies, runs in seconds without a build. `--format text|json|github` (inline PR annotations), `--fail-on error|warning|never`. First run against two green-building production sites found 37 live defects.
