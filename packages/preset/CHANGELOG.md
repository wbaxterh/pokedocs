# @pokedocs/preset

## 0.4.0

### Minor Changes

- [#89](https://github.com/wbaxterh/pokedocs/pull/89) [`cbeb4fe`](https://github.com/wbaxterh/pokedocs/commit/cbeb4fef81790f633935ca8d621acbd1699b22e2) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Well-known discovery files on every build (S3.2.1).

  - `/.well-known/agent-skills/index.json` per the agent-skills discovery RFC v0.2.0, with a
    `sha256:` digest of the listed skill, and the skill itself at
    `/.well-known/agent-skills/<name>/SKILL.md`: when to use it, the fetch order for this site,
    and its page list. A hand-written `SKILL.md` at that path in `static/` replaces the
    generated one, and the index takes its description from it.
  - `/.well-known/pokedocs.json`: a versioned manifest with the absolute URL of every agent
    artifact.
  - `pages.json` entries gain a `path` (the route).
  - New option `agentEndpoints.agentSkill: { name?, description? } | false`, validated by the
    preset against the agent-skills naming rules.

  `pokedocs deploy init github-pages` now writes `actions/upload-pages-artifact@v5` with
  `include-hidden-files: true`. From v4 the action drops dot-directories by default, which
  would silently strip `.well-known/` from the deploy.

- [#87](https://github.com/wbaxterh/pokedocs/pull/87) [`cb5b9a6`](https://github.com/wbaxterh/pokedocs/commit/cb5b9a6a8112efb17c574cf66b42c3852a9477b9) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Every `.md` twin now opens with a pointer to the site's `llms.txt` (S3.2.3).

  Agents usually land on one twin from a search result or a pasted link and never see the
  HTML `<link rel>` tags, so the twin itself now names the index:

  ```md
  > **Documentation index:** https://your.site/llms.txt
  > Use this file to discover all available pages before exploring further.
  ```

  On by default. `agentEndpoints.indexPointer: false` removes it; a string replaces the second
  line. It never appears in `llms-full.txt`, and it is skipped with a build warning while the
  site `url` is a placeholder. The placeholder-URL check now lives in the plugin
  (`isPlaceholderUrl`) and the preset's URL guard reuses it.

### Patch Changes

- Updated dependencies [[`cbeb4fe`](https://github.com/wbaxterh/pokedocs/commit/cbeb4fef81790f633935ca8d621acbd1699b22e2), [`11166d6`](https://github.com/wbaxterh/pokedocs/commit/11166d67972e26ea81759bc39e396bfea4cd4ccd), [`cb5b9a6`](https://github.com/wbaxterh/pokedocs/commit/cb5b9a6a8112efb17c574cf66b42c3852a9477b9)]:
  - @pokedocs/plugin-agent-endpoints@0.3.0

## 0.3.0

### Minor Changes

- [#80](https://github.com/wbaxterh/pokedocs/pull/80) [`864867d`](https://github.com/wbaxterh/pokedocs/commit/864867d180a1ed358ef90a7a9ca01a18c4098975) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Frontmatter contracts (S2.2.1/S2.2.2): declare schemas in config — per directory or glob, with required/string/number/boolean/date/enum fields — and violations fail the build before rendering, all at once, with file, field, and expected shape. Fields marked `index: true` flow into the agent surface: appended to `llms.txt` entries and emitted in the new `/pages.json`, a stable machine-readable page index (title, description, url, markdownUrl, fields). The preset wires it all by default (permissive with zero config); scaffolded sites now enforce `description` on every page — the convention AGENTS.md documents, made real. Also fixes a `pokedocs check` false positive on mermaid's `[(database)]` cylinder shape.

### Patch Changes

- Updated dependencies [[`864867d`](https://github.com/wbaxterh/pokedocs/commit/864867d180a1ed358ef90a7a9ca01a18c4098975)]:
  - @pokedocs/plugin-frontmatter-schema@0.1.0
  - @pokedocs/plugin-agent-endpoints@0.2.0

## 0.2.0

### Minor Changes

- [#72](https://github.com/wbaxterh/pokedocs/pull/72) [`f6ed403`](https://github.com/wbaxterh/pokedocs/commit/f6ed4032426d9798b336c93249620095a3cc437c) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Per-mode brand colors (S1.4.3, found migrating TrickBook's yellow brand): `brandColor` now accepts `{ light, dark }` for brands where one color can't serve both modes — the explicit dark primary is respected but still AA-lifted against the dark background when needed; single-string behavior is byte-identical to before. The preset validator covers the union. Also fixes discovery-link injection under `trailingSlash: false`, where Docusaurus emits flat `page.html` files instead of `page/index.html`.

### Patch Changes

- Updated dependencies [[`f6ed403`](https://github.com/wbaxterh/pokedocs/commit/f6ed4032426d9798b336c93249620095a3cc437c)]:
  - @pokedocs/theme@0.2.0
  - @pokedocs/plugin-agent-endpoints@0.1.1

## 0.1.0

### Minor Changes

- [#68](https://github.com/wbaxterh/pokedocs/pull/68) [`a1c66f5`](https://github.com/wbaxterh/pokedocs/commit/a1c66f51dee10237c036c20936aacd87000428eb) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Agent endpoints v1 (S1.5.1–S1.5.3): every build now emits the static agent surface — `/llms.txt` (llmstxt.org index with titles, descriptions, and markdown URLs), `/llms-full.txt` (the whole corpus in one fetch, code fences and mermaid sources verbatim), and a `.md` twin beside every HTML page at the same path. Each page's HTML head links its twin and the site index via `<link rel="alternate">`, so any entry URL discovers the machine-readable surface. `ingest: false` frontmatter (field configurable) excludes a page from all artifacts; drafts and unlisted pages are excluded automatically. The preset activates all of it by default; `agentEndpoints: false` or per-piece flags disable. Also fixes the `/search` route collision between the search docs page and the search-local results page.

- [#69](https://github.com/wbaxterh/pokedocs/pull/69) [`2cf02af`](https://github.com/wbaxterh/pokedocs/commit/2cf02afa0140905f9b9b2a37d618b9dc3fd649a6) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Host-anywhere kit v1 (S1.7.1–S1.7.3): `pokedocs deploy init` is live with pluggable targets — `github-pages` scaffolds the production-proven Pages workflow (chromium cached for mermaid, `.nojekyll`, `--domain` writes the CNAME) and `docker` generates a maintained multi-stage Dockerfile (chromium builder, unprivileged non-root nginx runtime, `try_files`/404/copy-path derived from the configured `baseUrl`, `--build-arg POKEDOCS_URL` override), verified against a real container run. The preset now eliminates the baseUrl footgun: a production build with a localhost-like or example.com url prints a prominent warning, and `POKEDOCS_STRICT_URL=true` makes it a build error. Scaffolded configs read `POKEDOCS_URL`/`POKEDOCS_BASE_URL` from the environment.

- [#66](https://github.com/wbaxterh/pokedocs/pull/66) [`a71a20b`](https://github.com/wbaxterh/pokedocs/commit/a71a20b363755a3af2cd38514b4468a5afd15689) Thanks [@wbaxterh](https://github.com/wbaxterh)! - The preset is real (S1.2.1/S1.2.2/S1.6.1): one `@pokedocs/preset` entry wraps the classic preset docs-first (`routeBasePath: '/'`, blog off) and activates every implemented capability — build-time mermaid, compiled branding (stylesheet, favicon, and font injection), and zero-signup local search per ADR-0002 — each disabled by a single option. Options are schema-validated at build start with errors that name the bad key, suggest the nearest known one, and show the expected shape with an example.

### Patch Changes

- [#56](https://github.com/wbaxterh/pokedocs/pull/56) [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Initial package skeletons: typed public contracts for the full PRD package map (M0).

- Updated dependencies [[`a1c66f5`](https://github.com/wbaxterh/pokedocs/commit/a1c66f51dee10237c036c20936aacd87000428eb), [`0de4015`](https://github.com/wbaxterh/pokedocs/commit/0de4015e3f35183fbacf0d131eb5306837551232), [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116), [`683f6be`](https://github.com/wbaxterh/pokedocs/commit/683f6be242ab3a1cdc5791d7c2175cde6f4cd0b7), [`8151c79`](https://github.com/wbaxterh/pokedocs/commit/8151c79a948eb122c542b0ccf4af4d439ca2e8f3)]:
  - @pokedocs/plugin-agent-endpoints@0.1.0
  - @pokedocs/theme@0.1.0
  - @pokedocs/plugin-frontmatter-schema@0.0.1
  - @pokedocs/plugin-mermaid-ssr@0.1.0
