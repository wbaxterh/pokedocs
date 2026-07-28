/**
 * The branding compiler (S1.4.1/S1.4.2): a `branding` config block in,
 * the complete computed theme out — full Infima shade ladders for both
 * color modes, contrast-checked, no custom.css and no swizzling.
 */

import {
  adjustLightness,
  contrastRatio,
  parseHex,
  rgba,
  tint,
  toHex,
} from './color.js';
import type { BrandingOptions } from './index.js';

/** The seven Infima primary shades for one color mode. */
export interface ShadeLadder {
  primary: string;
  dark: string;
  darker: string;
  darkest: string;
  light: string;
  lighter: string;
  lightest: string;
}

export interface CompiledBranding {
  /** Ready-to-inject stylesheet: `:root` + `[data-theme='dark']` blocks. */
  css: string;
  /** Computed light-mode ladder. */
  light: ShadeLadder;
  /** Computed dark-mode ladder, derived from a lifted primary (S1.4.2). */
  dark: ShadeLadder;
  /** Logo normalized to explicit light/dark variants (dark falls back to light). */
  logo?: { light: string; dark: string };
  /** Favicon path; defaults to the light logo variant. */
  favicon?: string;
  /** Google Fonts stylesheet URL when `font` is a family name. */
  fontStylesheetUrl?: string;
  colorMode: 'light' | 'dark' | 'system';
  /** Human-readable summary of every computed value (printed when `debug` is on). */
  report: string;
}

export interface CompileBrandingConfig {
  /** Print the computed-values report through `logger`. */
  debug?: boolean;
  /** Where the debug report goes. Defaults to `console.log`. */
  logger?: (message: string) => void;
}

/**
 * Infima's dark-mode background (`--ifm-background-color` under
 * `[data-theme='dark']`). The dark-mode primary is lifted until it reads
 * against this at WCAG AA.
 */
export const INFIMA_DARK_BACKGROUND = '#1b1b1d';

const WCAG_AA_CONTRAST = 4.5;

/**
 * Minimum tint applied to the dark-mode primary even when the brand already
 * clears AA contrast — the dark palette must be measurably lighter than the
 * light-mode primary, never the same color reused (S1.4.2).
 */
const MIN_DARK_TINT = 0.15;

/**
 * Shade offsets used by the official Docusaurus generator (via the `color`
 * package): relative HSL-lightness multipliers.
 */
const LADDER_STEPS = {
  dark: -0.1,
  darker: -0.15,
  darkest: -0.3,
  light: 0.1,
  lighter: 0.15,
  lightest: 0.3,
} as const;

function deriveLadder(primary: string): ShadeLadder {
  return {
    primary,
    dark: adjustLightness(primary, LADDER_STEPS.dark),
    darker: adjustLightness(primary, LADDER_STEPS.darker),
    darkest: adjustLightness(primary, LADDER_STEPS.darkest),
    light: adjustLightness(primary, LADDER_STEPS.light),
    lighter: adjustLightness(primary, LADDER_STEPS.lighter),
    lightest: adjustLightness(primary, LADDER_STEPS.lightest),
  };
}

/**
 * Smallest white-tint fraction that makes `brand` read at AA contrast
 * against the Infima dark background. Tinting toward white is monotonic in
 * luminance, so binary search converges; pure-black brands need ~0.55.
 */
function minimumTintForContrast(brand: string): number {
  if (contrastRatio(brand, INFIMA_DARK_BACKGROUND) >= WCAG_AA_CONTRAST) {
    return 0;
  }
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (
      contrastRatio(tint(brand, mid), INFIMA_DARK_BACKGROUND) >=
      WCAG_AA_CONTRAST
    ) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return high;
}

function ladderCss(ladder: ShadeLadder): string[] {
  return [
    `  --ifm-color-primary: ${ladder.primary};`,
    `  --ifm-color-primary-dark: ${ladder.dark};`,
    `  --ifm-color-primary-darker: ${ladder.darker};`,
    `  --ifm-color-primary-darkest: ${ladder.darkest};`,
    `  --ifm-color-primary-light: ${ladder.light};`,
    `  --ifm-color-primary-lighter: ${ladder.lighter};`,
    `  --ifm-color-primary-lightest: ${ladder.lightest};`,
  ];
}

function googleFontsUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}&display=swap`;
}

function formatLadder(label: string, ladder: ShadeLadder): string {
  return `  ${label}: ${ladder.darkest} ${ladder.darker} ${ladder.dark} [${ladder.primary}] ${ladder.light} ${ladder.lighter} ${ladder.lightest}`;
}

export function compileBranding(
  options: BrandingOptions,
  config: CompileBrandingConfig = {},
): CompiledBranding {
  // Normalize through parse/format so ladders and CSS agree on casing,
  // and so an invalid brand color fails here with a pointed message.
  const input = options.brandColor;
  const brand = toHex(
    parseHex(typeof input === 'string' ? input : input.light),
  );
  const light = deriveLadder(brand);

  // S1.4.3: an explicit dark-mode primary is respected as given — but the
  // correct-by-construction promise holds: it is still lifted the minimum
  // amount needed to read at AA on the dark background. A single brand
  // color additionally gets the floor tint, so dark mode is never just
  // the light primary reused.
  const explicitDark =
    typeof input === 'object' ? toHex(parseHex(input.dark)) : undefined;
  const darkBase = explicitDark ?? brand;
  const darkTint = explicitDark
    ? minimumTintForContrast(explicitDark)
    : Math.max(minimumTintForContrast(brand), MIN_DARK_TINT);
  const darkPrimary = tint(darkBase, darkTint);
  const dark = deriveLadder(darkPrimary);

  const logo =
    options.logo === undefined
      ? undefined
      : typeof options.logo === 'string'
        ? { light: options.logo, dark: options.logo }
        : options.logo;
  const favicon = options.favicon ?? logo?.light;
  const colorMode = options.colorMode ?? 'system';

  const lines = [':root {', ...ladderCss(light)];
  lines.push(
    `  --docusaurus-highlighted-code-line-bg: ${rgba(light.primary, 0.08)};`,
  );
  if (options.font) {
    lines.push(
      `  --ifm-font-family-base: '${options.font}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;`,
    );
  }
  lines.push('}', '', "[data-theme='dark'] {", ...ladderCss(dark));
  lines.push(
    `  --docusaurus-highlighted-code-line-bg: ${rgba(dark.primary, 0.15)};`,
  );
  lines.push('}');
  const css = `${lines.join('\n')}\n`;

  const darkContrast = contrastRatio(darkPrimary, INFIMA_DARK_BACKGROUND);
  const darkOrigin = explicitDark
    ? `explicit ${explicitDark}${darkTint > 0 ? ` + ${Math.round(darkTint * 100)}% white tint (AA lift)` : ''}`
    : `brand + ${Math.round(darkTint * 100)}% white tint`;
  const report = [
    `[@pokedocs/theme] branding compiled from ${brand}${explicitDark ? ` / dark ${explicitDark}` : ''}`,
    formatLadder('light', light),
    formatLadder('dark ', dark),
    `  dark primary = ${darkOrigin} → ${darkContrast.toFixed(2)}:1 against ${INFIMA_DARK_BACKGROUND}`,
    ...(logo ? [`  logo: light ${logo.light}, dark ${logo.dark}`] : []),
    ...(favicon ? [`  favicon: ${favicon}`] : []),
    ...(options.font
      ? [`  font: ${options.font} (${googleFontsUrl(options.font)})`]
      : []),
    `  color mode: ${colorMode}`,
  ].join('\n');

  if (config.debug) {
    (config.logger ?? console.log)(report);
  }

  return {
    css,
    light,
    dark,
    logo,
    favicon,
    fontStylesheetUrl: options.font ? googleFontsUrl(options.font) : undefined,
    colorMode,
    report,
  };
}
