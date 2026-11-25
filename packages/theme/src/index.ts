/**
 * @pokedocs/theme — one-line branding and reader-facing components (PRD F1.4, F3.1, F5.1).
 *
 * A schema-validated `branding` block compiles at build time into the full
 * Infima variable set: shade ladders for both color modes, contrast-checked,
 * no custom.css and no swizzling.
 */

import path from 'node:path';
import type { LoadContext, Plugin, SwizzleConfig } from '@docusaurus/types';
import {
  compileMermaidPalette,
  type MermaidPaletteOptions,
} from './mermaid-palette.js';

/**
 * Directory of reader-facing theme components (`@theme/PokedocsMermaid`, the
 * `@theme/MDXComponents` wrapper). Docusaurus aliases every file in here.
 */
export const THEME_COMPONENTS_PATH = path.join(__dirname, 'client', 'theme');

/** The stylesheet that recolors baked diagrams per color mode (S5.1.2). */
export const MERMAID_PALETTE_CSS = path.join(
  __dirname,
  '..',
  'css',
  'mermaid-palette.css',
);

export interface ThemeComponentsOptions {
  /**
   * Diagram colors (S5.1.2). By default diagrams are recolored from the
   * site's brand in both color modes; give `light` / `dark` colors to
   * override individual ones, or `false` to keep the palette mermaid baked
   * into the SVG at build time.
   */
  palette?: MermaidPaletteOptions | false;
}

/**
 * The Docusaurus theme behind PokeDocs diagrams: a zoom/pan/full-screen
 * viewer on every build-time mermaid diagram (S5.1.1) and a brand-derived
 * palette per color mode (S5.1.2). The preset registers it by default;
 * register it yourself only when using the packages without the preset, and
 * list it after the classic theme so it can wrap `@theme/MDXComponents`.
 */
export function pokedocsThemeComponents(
  _context?: LoadContext,
  options: ThemeComponentsOptions = {},
): Plugin {
  const { palette } = options;
  // Compiled here so a bad palette fails at build start, not in the browser.
  const overrides = palette ? compileMermaidPalette(palette) : '';
  return {
    name: 'pokedocs-theme-components',
    getThemePath: () => THEME_COMPONENTS_PATH,
    getClientModules: () => (palette === false ? [] : [MERMAID_PALETTE_CSS]),
    injectHtmlTags: () =>
      overrides
        ? { headTags: [{ tagName: 'style', innerHTML: overrides }] }
        : {},
  };
}

// Docusaurus reads the swizzle contract off the plugin module, not the
// plugin instance.
pokedocsThemeComponents.getSwizzleConfig = (): SwizzleConfig => ({
  components: {
    PokedocsMermaid: {
      actions: { wrap: 'safe', eject: 'unsafe' },
      description:
        'The frame around each build-time mermaid diagram: the Expand button and the zoom/pan viewer.',
    },
    MDXComponents: {
      actions: { wrap: 'unsafe', eject: 'forbidden' },
      description:
        'Routes the mermaid wrapper div to PokedocsMermaid. Wrap PokedocsMermaid instead.',
    },
  },
});

export interface BrandingOptions {
  /**
   * Primary brand color (hex). Shade ladders for light/dark modes are
   * derived from it — or give explicit per-mode primaries when one color
   * can't serve both (S1.4.3), e.g. a bright brand that fails contrast
   * on white. An explicit dark primary is still AA-lifted when needed.
   */
  brandColor: string | { light: string; dark: string };
  /** Logo path, with optional dark-mode variant. */
  logo?: string | { light: string; dark: string };
  /** Favicon path. Defaults to the logo. */
  favicon?: string;
  /** Body font family name (loaded from Google Fonts or a local file). */
  font?: string;
  /** Default color mode. */
  colorMode?: 'light' | 'dark' | 'system';
}

export {
  type CompileBrandingConfig,
  type CompiledBranding,
  compileBranding,
  INFIMA_DARK_BACKGROUND,
  type ShadeLadder,
} from './branding.js';
export { contrastRatio, lightnessOf } from './color.js';
export {
  compileMermaidPalette,
  MERMAID_PALETTE_KEYS,
  type MermaidPalette,
  type MermaidPaletteKey,
  type MermaidPaletteOptions,
  mermaidPaletteVariable,
} from './mermaid-palette.js';
