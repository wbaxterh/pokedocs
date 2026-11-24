/**
 * Diagram palettes (S5.1.2). Build-time mermaid bakes one set of colors into
 * each SVG, so color-mode support is done in CSS: `css/mermaid-palette.css`
 * recolors the baked SVG from custom properties whose defaults derive from
 * the site's own Infima variables — the ones the branding block compiles.
 *
 * This module turns an explicit per-mode palette into the stylesheet that
 * overrides those defaults.
 */

/** Every color a diagram palette controls. */
export const MERMAID_PALETTE_KEYS = [
  'text',
  'line',
  'nodeFill',
  'nodeStroke',
  'clusterFill',
  'clusterStroke',
  'labelBackground',
  'noteFill',
  'noteStroke',
  'noteText',
] as const;

export type MermaidPaletteKey = (typeof MERMAID_PALETTE_KEYS)[number];

/**
 * Colors for one color mode; any CSS color value. Unset keys keep the
 * brand-derived default.
 */
export type MermaidPalette = Partial<Record<MermaidPaletteKey, string>>;

export interface MermaidPaletteOptions {
  light?: MermaidPalette;
  dark?: MermaidPalette;
}

/** The custom property a palette key sets, e.g. `--pokedocs-mermaid-node-fill`. */
export function mermaidPaletteVariable(key: MermaidPaletteKey): string {
  return `--pokedocs-mermaid-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/**
 * A value lands inside a `<style>` tag, so anything that could close the
 * declaration, the rule or the tag is rejected rather than escaped.
 */
const UNSAFE_VALUE = /[;{}<>\\]|\/\*/;

function modeDeclarations(
  mode: 'light' | 'dark',
  palette: MermaidPalette | undefined,
): string[] {
  if (palette === undefined) return [];
  if (typeof palette !== 'object' || palette === null) {
    throw new Error(
      `[@pokedocs/theme] mermaid palette "${mode}" must be an object of colors, got ${String(palette)}.`,
    );
  }
  return Object.entries(palette).map(([key, value]) => {
    if (!(MERMAID_PALETTE_KEYS as readonly string[]).includes(key)) {
      throw new Error(
        `[@pokedocs/theme] unknown mermaid palette key "${key}" in "${mode}". Known keys: ${MERMAID_PALETTE_KEYS.join(', ')}.`,
      );
    }
    if (
      typeof value !== 'string' ||
      value.trim() === '' ||
      UNSAFE_VALUE.test(value)
    ) {
      throw new Error(
        `[@pokedocs/theme] mermaid palette "${mode}.${key}" must be a CSS color such as "#1c2b3f", got ${JSON.stringify(value)}.`,
      );
    }
    return `  ${mermaidPaletteVariable(key as MermaidPaletteKey)}: ${value.trim()};`;
  });
}

/**
 * Compile a per-mode palette into the stylesheet that overrides the
 * brand-derived defaults. Returns an empty string when nothing is set.
 * Throws on an unknown key or a value that is not a plain CSS color.
 */
export function compileMermaidPalette(
  options: MermaidPaletteOptions = {},
): string {
  for (const mode of Object.keys(options)) {
    if (mode !== 'light' && mode !== 'dark') {
      throw new Error(
        `[@pokedocs/theme] unknown mermaid palette mode "${mode}". Use "light" and "dark".`,
      );
    }
  }
  const light = modeDeclarations('light', options.light);
  const dark = modeDeclarations('dark', options.dark);
  const blocks: string[] = [];
  if (light.length > 0) blocks.push([':root {', ...light, '}'].join('\n'));
  if (dark.length > 0) {
    blocks.push(["[data-theme='dark'] {", ...dark, '}'].join('\n'));
  }
  return blocks.length > 0 ? `${blocks.join('\n\n')}\n` : '';
}
