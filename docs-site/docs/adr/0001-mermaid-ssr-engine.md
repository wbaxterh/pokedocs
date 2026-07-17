---
sidebar_position: 1
description: "ADR-0001: rehype-mermaid (inline-svg) is the build-time mermaid engine for @pokedocs/plugin-mermaid-ssr — benchmarked against @mermaid-js/mermaid-cli on a 60-page, 36-diagram corpus."
---

# ADR-0001: Mermaid SSR engine

**Status:** Accepted · **Story:** S1.3.4 · **Date:** 2026-07-17

## Context

F1.3 (build-time mermaid rendering) requires: SVG baked into static HTML, the raw mermaid source preserved for agents, and builds that fail with file + line on a syntax error. Two engines were benchmarked in isolated worktrees on the same synthetic corpus — 60 pages, 36 diagrams (20 flowchart, 10 sequence, 6 gantt), mermaid 11.16.0 in both, Docusaurus 3.10.2, median of 3 cold builds with all caches cleared (including the rspack persistent cache in `node_modules/.cache`, which otherwise silently skips rendering).

## Benchmark

| | Baseline (client-side theme-mermaid) | **rehype-mermaid 3.0.0** | @mermaid-js/mermaid-cli 11.16.0 |
|---|---|---|---|
| Cold build (median) | 4.67 s | **7.65 s** | 11.42 s |
| SVG in static HTML | ✗ | ✅ | ✅ |
| Broken diagram → build fails | ✗ (browser-only error) | ✅ exit 1, **file + fence line range** (`broken-diagram.md:11:1-16:4`) + mermaid's caret-annotated parse message | API throws, but file/line attribution is entirely wrapper's job; error buried in ~10 frames of puppeteer CDP noise |
| Browser dependency | mermaid in reader's browser | **playwright 1.61.1 — identical to our e2e dependency; zero extra CI download** | Second, puppeteer-pinned Chrome (~170 MB); pnpm 10 blocks its postinstall by default |
| Integration surface | theme swap | rehype plugin in the docs pipeline | No remark/rehype integration exists — full custom plugin + browser lifecycle to build |

Output fidelity is a wash: same mermaid 11.16.0 engine, 36/36 diagrams rendered identically by both.

## Decision

**rehype-mermaid (strategy `inline-svg`), wrapped inside `@pokedocs/plugin-mermaid-ssr` as a CJS package.** The wrapper (validated in the spike) must:

1. **Defer the ESM import to MDX-transform time.** Docusaurus's TS config loader (jiti 1.21) cannot import ESM-only rehype-mermaid from `docusaurus.config.ts` by any route — a CJS wrapper package is the only reliable shape, and it's the shape our plugin takes anyway.
2. **Share one transformer across all files.** A naive per-file transformer launched a browser per file: 91.3 s (12×). Shared: 7.65 s.
3. **Run a source-preservation pre-pass** (~20 lines): wrap each mermaid fence in `<div class="pokedocs-mermaid" data-mermaid-source="…">` before rendering. Verified: every page ships **both** the inline SVG and the verbatim source (S1.3.2's contract).
4. **Disable `markdown.mermaid` and `@docusaurus/theme-mermaid`** — otherwise the fence becomes a React component before rehype sees it.
5. Catch and reformat the (correct but verbose) error output.

## Consequences

- ~3 s SSR cost per ~36 diagrams — acceptable; scales with diagram count, not page count.
- `playwright` and `@playwright/test` must stay version-locked so the browser cache is shared.
- Dark mode: the `dark` option is ignored for `inline-svg` — S5.1.2 handles this via dual render + `[data-theme]` toggle or CSS-variable themes (mermaid-isomorphic exposes raw SVG strings, so it layers cleanly).
- `@mermaid-js/mermaid-cli` is rejected: slower, second browser in CI, and the whole file/line error story would need building from scratch.
