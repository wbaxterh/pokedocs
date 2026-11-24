---
"@pokedocs/theme": minor
"@pokedocs/preset": minor
---

Diagram colors now derive from your brand in both color modes (S5.1.2).

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
- **Hydration fix.** Pages with a diagram no longer raise React error #418 and re-render the
  diagram after load. The production HTML minifier rewrites mermaid's inline `<style>`, which
  no longer matched at hydration.

**If you worked around dark mode** by putting a light background behind `.pokedocs-mermaid`
in `custom.css` (the README used to suggest it), delete that rule: diagram lines are now light
in dark mode and would disappear on a light card.
