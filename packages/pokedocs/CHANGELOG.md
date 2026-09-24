# pokedocs

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

### Patch Changes

- Updated dependencies [[`cbeb4fe`](https://github.com/wbaxterh/pokedocs/commit/cbeb4fef81790f633935ca8d621acbd1699b22e2), [`11166d6`](https://github.com/wbaxterh/pokedocs/commit/11166d67972e26ea81759bc39e396bfea4cd4ccd), [`cb5b9a6`](https://github.com/wbaxterh/pokedocs/commit/cb5b9a6a8112efb17c574cf66b42c3852a9477b9)]:
  - @pokedocs/plugin-agent-endpoints@0.3.0

## 0.2.1

### Patch Changes

- [#80](https://github.com/wbaxterh/pokedocs/pull/80) [`864867d`](https://github.com/wbaxterh/pokedocs/commit/864867d180a1ed358ef90a7a9ca01a18c4098975) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Frontmatter contracts (S2.2.1/S2.2.2): declare schemas in config — per directory or glob, with required/string/number/boolean/date/enum fields — and violations fail the build before rendering, all at once, with file, field, and expected shape. Fields marked `index: true` flow into the agent surface: appended to `llms.txt` entries and emitted in the new `/pages.json`, a stable machine-readable page index (title, description, url, markdownUrl, fields). The preset wires it all by default (permissive with zero config); scaffolded sites now enforce `description` on every page — the convention AGENTS.md documents, made real. Also fixes a `pokedocs check` false positive on mermaid's `[(database)]` cylinder shape.

## 0.2.0

### Minor Changes

- [#77](https://github.com/wbaxterh/pokedocs/pull/77) [`3791019`](https://github.com/wbaxterh/pokedocs/commit/3791019cd4c5678bbce6d65b27f5fabe8d2a80b4) Thanks [@wbaxterh](https://github.com/wbaxterh)! - `pokedocs check` is live (S2.1.1–S2.1.3): the docs linter for what a green build won't catch — broken admonition titles (`:::warning Title` vs `:::warning[Title]`), unclosed admonitions and fences, MDX3 compile hazards (`<digit`, `{#custom-id}` headings under `future.v4`), unquoted mermaid label parentheses, orphaned pages, and dangling sidebar entries. Zero dependencies, runs in seconds without a build. `--format text|json|github` (inline PR annotations), `--fail-on error|warning|never`. First run against two green-building production sites found 37 live defects.

## 0.1.0

### Minor Changes

- [#69](https://github.com/wbaxterh/pokedocs/pull/69) [`2cf02af`](https://github.com/wbaxterh/pokedocs/commit/2cf02afa0140905f9b9b2a37d618b9dc3fd649a6) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Host-anywhere kit v1 (S1.7.1–S1.7.3): `pokedocs deploy init` is live with pluggable targets — `github-pages` scaffolds the production-proven Pages workflow (chromium cached for mermaid, `.nojekyll`, `--domain` writes the CNAME) and `docker` generates a maintained multi-stage Dockerfile (chromium builder, unprivileged non-root nginx runtime, `try_files`/404/copy-path derived from the configured `baseUrl`, `--build-arg POKEDOCS_URL` override), verified against a real container run. The preset now eliminates the baseUrl footgun: a production build with a localhost-like or example.com url prints a prominent warning, and `POKEDOCS_STRICT_URL=true` makes it a build error. Scaffolded configs read `POKEDOCS_URL`/`POKEDOCS_BASE_URL` from the environment.

### Patch Changes

- [#56](https://github.com/wbaxterh/pokedocs/pull/56) [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Initial package skeletons: typed public contracts for the full PRD package map (M0).
