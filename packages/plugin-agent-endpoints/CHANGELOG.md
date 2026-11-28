# @pokedocs/plugin-agent-endpoints

## 0.3.0

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

- [#91](https://github.com/wbaxterh/pokedocs/pull/91) [`11166d6`](https://github.com/wbaxterh/pokedocs/commit/11166d67972e26ea81759bc39e396bfea4cd4ccd) Thanks [@wbaxterh](https://github.com/wbaxterh)! - HTTP discovery for generated host configs (S3.2.4).

  - Every `deploy init` target that can set response headers now sends a `Link` header
    advertising `llms.txt`, `llms-full.txt`, the agent-skills index, and `pokedocs.json`.
    New targets: `netlify` and `cloudflare-pages` (both write `static/_headers`) and `vercel`
    (writes `vercel.json`). The link targets come from the plugin's `AGENT_ARTIFACTS` list,
    the same one `pokedocs.json` is built from, and the agent-skills link is left out when the
    config sets `agentSkill: false`.
  - The `docker` target's nginx conf negotiates: `Accept: text/markdown` on a page URL returns
    its `.md` twin with `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`. The
    twin is served only when it exists, so browsers, assets, and `llms.txt` are unaffected.
    Direct `.md` requests get the same content type.
  - Fix: the docker target's slash redirect (`/page` to `/page/`) no longer names the
    container's internal port in `Location`, which broke navigation behind any port mapping
    or proxy (`absolute_redirect off`).

  Netlify, Cloudflare Pages, and Vercel cannot negotiate from static config; that is S3.2.5.

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

## 0.2.0

### Minor Changes

- [#80](https://github.com/wbaxterh/pokedocs/pull/80) [`864867d`](https://github.com/wbaxterh/pokedocs/commit/864867d180a1ed358ef90a7a9ca01a18c4098975) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Frontmatter contracts (S2.2.1/S2.2.2): declare schemas in config — per directory or glob, with required/string/number/boolean/date/enum fields — and violations fail the build before rendering, all at once, with file, field, and expected shape. Fields marked `index: true` flow into the agent surface: appended to `llms.txt` entries and emitted in the new `/pages.json`, a stable machine-readable page index (title, description, url, markdownUrl, fields). The preset wires it all by default (permissive with zero config); scaffolded sites now enforce `description` on every page — the convention AGENTS.md documents, made real. Also fixes a `pokedocs check` false positive on mermaid's `[(database)]` cylinder shape.

## 0.1.1

### Patch Changes

- [#72](https://github.com/wbaxterh/pokedocs/pull/72) [`f6ed403`](https://github.com/wbaxterh/pokedocs/commit/f6ed4032426d9798b336c93249620095a3cc437c) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Per-mode brand colors (S1.4.3, found migrating TrickBook's yellow brand): `brandColor` now accepts `{ light, dark }` for brands where one color can't serve both modes — the explicit dark primary is respected but still AA-lifted against the dark background when needed; single-string behavior is byte-identical to before. The preset validator covers the union. Also fixes discovery-link injection under `trailingSlash: false`, where Docusaurus emits flat `page.html` files instead of `page/index.html`.

## 0.1.0

### Minor Changes

- [#68](https://github.com/wbaxterh/pokedocs/pull/68) [`a1c66f5`](https://github.com/wbaxterh/pokedocs/commit/a1c66f51dee10237c036c20936aacd87000428eb) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Agent endpoints v1 (S1.5.1–S1.5.3): every build now emits the static agent surface — `/llms.txt` (llmstxt.org index with titles, descriptions, and markdown URLs), `/llms-full.txt` (the whole corpus in one fetch, code fences and mermaid sources verbatim), and a `.md` twin beside every HTML page at the same path. Each page's HTML head links its twin and the site index via `<link rel="alternate">`, so any entry URL discovers the machine-readable surface. `ingest: false` frontmatter (field configurable) excludes a page from all artifacts; drafts and unlisted pages are excluded automatically. The preset activates all of it by default; `agentEndpoints: false` or per-piece flags disable. Also fixes the `/search` route collision between the search docs page and the search-local results page.

### Patch Changes

- [#56](https://github.com/wbaxterh/pokedocs/pull/56) [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Initial package skeletons: typed public contracts for the full PRD package map (M0).
