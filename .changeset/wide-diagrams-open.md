---
"@pokedocs/theme": minor
"@pokedocs/preset": minor
---

Every mermaid diagram now opens in a zoom, pan and full-screen viewer (S5.1.1).

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
