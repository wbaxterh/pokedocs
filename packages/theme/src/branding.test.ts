import { describe, expect, it, vi } from 'vitest';
import { compileBranding, INFIMA_DARK_BACKGROUND } from './branding.js';
import { contrastRatio, lightnessOf, parseHex } from './color.js';

/**
 * Representative brands per S1.4.2: the dogfood red, a mid blue, the
 * Docusaurus default green, a very light brand, a very dark brand, and
 * pure black as the extreme.
 */
const REPRESENTATIVE_BRANDS = [
  '#d8232a', // pokedex red (the dogfood site)
  '#2ea8e0', // lens blue
  '#25c2a0', // Docusaurus default green
  '#ffee58', // very light brand
  '#111827', // very dark brand
  '#000000', // extreme: black
];

function maxChannelDelta(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return Math.max(
    Math.abs(ca.r - cb.r),
    Math.abs(ca.g - cb.g),
    Math.abs(ca.b - cb.b),
  );
}

describe('S1.4.1 — brandColor to full theme', () => {
  it('matches the official Docusaurus shade generator for #25c2a0 (±1/channel rounding)', () => {
    // Expected values are what docusaurus.io's color generator produces for
    // its own default primary — the ladder users are told to hand-derive.
    const { light } = compileBranding({ brandColor: '#25c2a0' });
    const official = {
      primary: '#25c2a0',
      dark: '#21af90',
      darker: '#1fa588',
      darkest: '#1a8870',
      light: '#29d5b0',
      lighter: '#32d8b4',
      lightest: '#4fddbf',
    };
    for (const [shade, expected] of Object.entries(official)) {
      const actual = light[shade as keyof typeof official];
      expect(
        maxChannelDelta(actual, expected),
        `${shade}: ${actual} vs official ${expected}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('emits both color-mode blocks with all seven shades', () => {
    const { css } = compileBranding({ brandColor: '#d8232a' });
    expect(css).toContain(':root {');
    expect(css).toContain("[data-theme='dark'] {");
    const varNames = [
      '--ifm-color-primary:',
      '--ifm-color-primary-dark:',
      '--ifm-color-primary-darker:',
      '--ifm-color-primary-darkest:',
      '--ifm-color-primary-light:',
      '--ifm-color-primary-lighter:',
      '--ifm-color-primary-lightest:',
    ];
    for (const name of varNames) {
      expect(css.split(name)).toHaveLength(3); // once per color mode
    }
  });

  it('normalizes a string logo to light/dark variants and defaults the favicon to it', () => {
    const compiled = compileBranding({
      brandColor: '#d8232a',
      logo: 'img/logo-badge.svg',
    });
    expect(compiled.logo).toEqual({
      light: 'img/logo-badge.svg',
      dark: 'img/logo-badge.svg',
    });
    expect(compiled.favicon).toBe('img/logo-badge.svg');
  });

  it('preserves explicit light/dark logo variants and an explicit favicon', () => {
    const compiled = compileBranding({
      brandColor: '#d8232a',
      logo: { light: 'img/light.svg', dark: 'img/dark.svg' },
      favicon: 'img/favicon.ico',
    });
    expect(compiled.logo).toEqual({
      light: 'img/light.svg',
      dark: 'img/dark.svg',
    });
    expect(compiled.favicon).toBe('img/favicon.ico');
  });

  it('emits the font variable and a Google Fonts URL when font is set', () => {
    const compiled = compileBranding({
      brandColor: '#d8232a',
      font: 'Source Sans 3',
    });
    expect(compiled.css).toContain("--ifm-font-family-base: 'Source Sans 3'");
    expect(compiled.fontStylesheetUrl).toBe(
      'https://fonts.googleapis.com/css2?family=Source+Sans+3&display=swap',
    );
  });

  it('exposes computed values through the debug flag', () => {
    const logger = vi.fn();
    const compiled = compileBranding(
      { brandColor: '#d8232a' },
      { debug: true, logger },
    );
    expect(logger).toHaveBeenCalledOnce();
    const report = logger.mock.calls[0][0] as string;
    expect(report).toBe(compiled.report);
    expect(report).toContain('#d8232a');
    expect(report).toContain(compiled.dark.primary);
    expect(report).toContain('white tint');
  });

  it('stays silent without the debug flag', () => {
    const logger = vi.fn();
    compileBranding({ brandColor: '#d8232a' }, { logger });
    expect(logger).not.toHaveBeenCalled();
  });

  it('rejects a non-hex brand color loudly', () => {
    expect(() => compileBranding({ brandColor: 'pokedex-red' })).toThrow(
      /expected a hex color/,
    );
  });
});

describe('S1.4.2 — dark mode correct by construction', () => {
  it.each(REPRESENTATIVE_BRANDS)(
    'dark primary for %s is measurably lighter than the light primary',
    (brand) => {
      const { light, dark } = compileBranding({ brandColor: brand });
      expect(lightnessOf(dark.primary)).toBeGreaterThanOrEqual(
        lightnessOf(light.primary) + 0.04,
      );
    },
  );

  it.each(REPRESENTATIVE_BRANDS)(
    'dark primary for %s reads at WCAG AA against the Infima dark background',
    (brand) => {
      const { dark } = compileBranding({ brandColor: brand });
      expect(
        contrastRatio(dark.primary, INFIMA_DARK_BACKGROUND),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('keeps a near-white brand at least as light in dark mode', () => {
    const { light, dark } = compileBranding({ brandColor: '#fafafa' });
    expect(lightnessOf(dark.primary)).toBeGreaterThanOrEqual(
      lightnessOf(light.primary),
    );
  });

  it.each(REPRESENTATIVE_BRANDS)('snapshot: computed theme for %s', (brand) => {
    const { css, light, dark } = compileBranding({ brandColor: brand });
    expect({ light, dark, css }).toMatchSnapshot();
  });
});
