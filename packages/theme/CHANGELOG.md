# @pokedocs/theme

## 0.2.0

### Minor Changes

- [#72](https://github.com/wbaxterh/pokedocs/pull/72) [`f6ed403`](https://github.com/wbaxterh/pokedocs/commit/f6ed4032426d9798b336c93249620095a3cc437c) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Per-mode brand colors (S1.4.3, found migrating TrickBook's yellow brand): `brandColor` now accepts `{ light, dark }` for brands where one color can't serve both modes — the explicit dark primary is respected but still AA-lifted against the dark background when needed; single-string behavior is byte-identical to before. The preset validator covers the union. Also fixes discovery-link injection under `trailingSlash: false`, where Docusaurus emits flat `page.html` files instead of `page/index.html`.

## 0.1.0

### Minor Changes

- [#63](https://github.com/wbaxterh/pokedocs/pull/63) [`0de4015`](https://github.com/wbaxterh/pokedocs/commit/0de4015e3f35183fbacf0d131eb5306837551232) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Branding compiler (S1.4.1/S1.4.2): `compileBranding` turns a `branding` block into the complete computed theme — seven-shade Infima ladders for both color modes using the official Docusaurus generator's lightness steps, a dark-mode primary lifted with the smallest white tint (≥15%) that clears WCAG AA against Infima's dark background, logo light/dark normalization, favicon and font handling, and a debug flag that prints every computed value.

### Patch Changes

- [#56](https://github.com/wbaxterh/pokedocs/pull/56) [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Initial package skeletons: typed public contracts for the full PRD package map (M0).
