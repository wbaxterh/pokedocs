# pokedocs

## 0.2.0

### Minor Changes

- [#77](https://github.com/wbaxterh/pokedocs/pull/77) [`3791019`](https://github.com/wbaxterh/pokedocs/commit/3791019cd4c5678bbce6d65b27f5fabe8d2a80b4) Thanks [@wbaxterh](https://github.com/wbaxterh)! - `pokedocs check` is live (S2.1.1–S2.1.3): the docs linter for what a green build won't catch — broken admonition titles (`:::warning Title` vs `:::warning[Title]`), unclosed admonitions and fences, MDX3 compile hazards (`<digit`, `{#custom-id}` headings under `future.v4`), unquoted mermaid label parentheses, orphaned pages, and dangling sidebar entries. Zero dependencies, runs in seconds without a build. `--format text|json|github` (inline PR annotations), `--fail-on error|warning|never`. First run against two green-building production sites found 37 live defects.

## 0.1.0

### Minor Changes

- [#69](https://github.com/wbaxterh/pokedocs/pull/69) [`2cf02af`](https://github.com/wbaxterh/pokedocs/commit/2cf02afa0140905f9b9b2a37d618b9dc3fd649a6) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Host-anywhere kit v1 (S1.7.1–S1.7.3): `pokedocs deploy init` is live with pluggable targets — `github-pages` scaffolds the production-proven Pages workflow (chromium cached for mermaid, `.nojekyll`, `--domain` writes the CNAME) and `docker` generates a maintained multi-stage Dockerfile (chromium builder, unprivileged non-root nginx runtime, `try_files`/404/copy-path derived from the configured `baseUrl`, `--build-arg POKEDOCS_URL` override), verified against a real container run. The preset now eliminates the baseUrl footgun: a production build with a localhost-like or example.com url prints a prominent warning, and `POKEDOCS_STRICT_URL=true` makes it a build error. Scaffolded configs read `POKEDOCS_URL`/`POKEDOCS_BASE_URL` from the environment.

### Patch Changes

- [#56](https://github.com/wbaxterh/pokedocs/pull/56) [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Initial package skeletons: typed public contracts for the full PRD package map (M0).
