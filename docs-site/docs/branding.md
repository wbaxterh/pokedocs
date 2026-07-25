---
sidebar_position: 3
description: One-line branding — set brandColor in config and the compiler derives complete Infima shade ladders for light and dark modes, contrast-checked, with no custom.css.
---

# Branding

Branding a Docusaurus site normally means hand-deriving fourteen Infima CSS
variables — seven shades for light mode, seven more for dark — and knowing
the non-obvious rule that dark mode needs a *lighter* primary, not a darker
one. PokeDocs compiles all of it from one block:

```ts title="docusaurus.config.ts"
branding: {
  brandColor: '#D8232A',
  logo: 'img/logo-badge.svg',
}
```

This site is the proof: its red theme, in both color modes, is exactly that
block. There is no shade ladder in `custom.css`.

## What the compiler derives

**Light mode.** The seven-shade primary ladder uses the same
relative-lightness steps as the official Docusaurus shade generator, so the
output matches what the docs would have told you to paste by hand.

**Dark mode — correct by construction.** The classic mistake is reusing or
darkening the brand color for dark mode, which lands illegible text on a
near-black background. The compiler instead *lifts* the primary: it mixes in
the smallest amount of white (at least 15%) that makes the color read at
WCAG AA (4.5:1) against Infima's dark background, then builds the dark-mode
ladder from that lifted primary. A dark red brand like `#D8232A` comes out
as a readable `#e05257`, verified 4.52:1.

**The rest of the block.**

- `logo` — a single path, or `{ light, dark }` variants for mode-aware
  navbars.
- `favicon` — defaults to the logo.
- `font` — a Google Fonts family name; emits `--ifm-font-family-base` plus
  the stylesheet URL.
- `colorMode` — `light`, `dark`, or `system` (default).

## Inspecting the computed theme

Pass a debug flag and the compiler prints every derived value during the
build — both ladders, the tint percentage, and the achieved contrast ratio:

```ts
compileBranding({ brandColor: '#D8232A' }, { debug: true })
```

```text
[@pokedocs/theme] branding compiled from #d8232a
  light: #97191d #b81e24 #c22026 [#d8232a] #de363c #e04147 #e56166
  dark : #b62126 #d92b31 #db383e [#e05257] #e56c70 #e7797d #eea0a3
  dark primary = brand + 21% white tint → 4.52:1 against #1b1b1d
```

Until the `@pokedocs/preset` wiring lands (F1.2), sites consume the compiler
directly the way [this site's config](https://github.com/wbaxterh/pokedocs/blob/main/docs-site/docusaurus.config.ts)
does; the preset will make the block above the only thing you write.
