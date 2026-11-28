# @pokedocs/theme

## 0.3.0

### Minor Changes

- [#97](https://github.com/wbaxterh/pokedocs/pull/97) [`141b9ef`](https://github.com/wbaxterh/pokedocs/commit/141b9ef29a4af106f132019042a7324b570a4294) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Diagram colors now derive from your brand in both color modes (S5.1.2).

  Build-time mermaid bakes one palette into the SVG, so diagrams looked the same in light and
  dark mode, with dark edges and arrowheads vanishing on a dark page. Diagrams are now recolored
  in CSS from the variables the `branding` block compiles: nodes take a tint of the brand color
  with the brand color as the outline, and lines, arrowheads and text use the neutral scale that
  flips with the color mode. On by default; nothing to configure.

  - **Per-mode overrides.** `mermaid.palette: { light: {...}, dark: {...} }` sets any of `text`,
    `line`, `nodeFill`, `nodeStroke`, `clusterFill`, `clusterStroke`, `labelBackground`,
    `noteFill`, `noteStroke`, `noteText`. Each is also a CSS variable
    (`--pokedocs-mermaid-node-fill`). An unknown key or a non-color value fails the build.
  - **Your own colors win.** Nodes colored with `classDef` or `style` keep their color in both
    modes. `palette: false` keeps mermaid's baked palette, and so does setting `themeVariables`
    or `mermaidConfig` unless you add a `palette` beside them.
  - **Hydration fix.** Pages with a diagram no longer raise React error [#418](https://github.com/wbaxterh/pokedocs/issues/418) and re-render the
    diagram after load. The production HTML minifier rewrites mermaid's inline `<style>`, which
    no longer matched at hydration.

  **If you worked around dark mode** by putting a light background behind `.pokedocs-mermaid`
  in `custom.css` (the README used to suggest it), delete that rule: diagram lines are now light
  in dark mode and would disappear on a light card.

- [#95](https://github.com/wbaxterh/pokedocs/pull/95) [`6462338`](https://github.com/wbaxterh/pokedocs/commit/6462338d940e212090297a1bd215f33792343935) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Every mermaid diagram now opens in a zoom, pan and full-screen viewer (S5.1.1).

  Diagrams get an **Expand** button; clicking it or the diagram opens a viewer that covers the
  window. Scroll or pinch to zoom at the cursor, drag to pan, double-click to zoom in, `Fit`,
  `100%`, real full screen, `Esc` to close. Everything is reachable from the keyboard
  (`+` `-` `0` `1` `F`, arrows). The SVG is resized rather than scaled, so labels stay sharp up
  to 800%.

  On by default through the preset, with no per-site code. The frame is a supported theme
  component, `@theme/PokedocsMermaid`, so it can be swizzled; the pan and zoom code is a
  separate chunk that loads only on pages containing a diagram. `mermaid: false` turns it off
  along with build-time rendering.

  `@pokedocs/theme` now declares `react` as a peer dependency (the site's own copy) and exports
  `pokedocsThemeComponents` for setups that wire the packages without the preset. A site that
  already swizzled `@theme/MDXComponents` to handle `div.pokedocs-mermaid` keeps its own
  behavior and can delete that override.

## 0.2.0

### Minor Changes

- [#72](https://github.com/wbaxterh/pokedocs/pull/72) [`f6ed403`](https://github.com/wbaxterh/pokedocs/commit/f6ed4032426d9798b336c93249620095a3cc437c) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Per-mode brand colors (S1.4.3, found migrating TrickBook's yellow brand): `brandColor` now accepts `{ light, dark }` for brands where one color can't serve both modes — the explicit dark primary is respected but still AA-lifted against the dark background when needed; single-string behavior is byte-identical to before. The preset validator covers the union. Also fixes discovery-link injection under `trailingSlash: false`, where Docusaurus emits flat `page.html` files instead of `page/index.html`.

## 0.1.0

### Minor Changes

- [#63](https://github.com/wbaxterh/pokedocs/pull/63) [`0de4015`](https://github.com/wbaxterh/pokedocs/commit/0de4015e3f35183fbacf0d131eb5306837551232) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Branding compiler (S1.4.1/S1.4.2): `compileBranding` turns a `branding` block into the complete computed theme — seven-shade Infima ladders for both color modes using the official Docusaurus generator's lightness steps, a dark-mode primary lifted with the smallest white tint (≥15%) that clears WCAG AA against Infima's dark background, logo light/dark normalization, favicon and font handling, and a debug flag that prints every computed value.

### Patch Changes

- [#56](https://github.com/wbaxterh/pokedocs/pull/56) [`2ed5718`](https://github.com/wbaxterh/pokedocs/commit/2ed57185f7f70061ea4b1cd7ebacdaa087ab1116) Thanks [@wbaxterh](https://github.com/wbaxterh)! - Initial package skeletons: typed public contracts for the full PRD package map (M0).
