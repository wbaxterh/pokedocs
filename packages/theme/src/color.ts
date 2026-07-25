/**
 * Minimal color math for the branding compiler (S1.4.1/S1.4.2).
 *
 * Zero dependencies on purpose: this runs inside `docusaurus.config.*` via
 * jiti, so everything here must be plain CJS-safe TypeScript. The
 * lighten/darken semantics deliberately match the `color` package used by
 * the official Docusaurus shade generator (relative multiplication of HSL
 * lightness), so ladders produced here line up with what the docs recommend.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  /** Hue in degrees [0, 360). */
  h: number;
  /** Saturation [0, 1]. */
  s: number;
  /** Lightness [0, 1]. */
  l: number;
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHex(hex: string): Rgb {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(
      `[@pokedocs/theme] invalid brand color ${JSON.stringify(hex)} — expected a hex color like "#D8232A" or "#D82" (named CSS colors are not supported).`,
    );
  }
  let digits = hex.slice(1);
  if (digits.length === 3) {
    digits = digits.replace(/./g, (c) => c + c);
  }
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) {
    h = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  h *= 60;
  if (h < 0) {
    h += 360;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (hp < 1) {
    [rn, gn, bn] = [c, x, 0];
  } else if (hp < 2) {
    [rn, gn, bn] = [x, c, 0];
  } else if (hp < 3) {
    [rn, gn, bn] = [0, c, x];
  } else if (hp < 4) {
    [rn, gn, bn] = [0, x, c];
  } else if (hp < 5) {
    [rn, gn, bn] = [x, 0, c];
  } else {
    [rn, gn, bn] = [c, 0, x];
  }
  const m = l - c / 2;
  return { r: (rn + m) * 255, g: (gn + m) * 255, b: (bn + m) * 255 };
}

/** HSL lightness [0, 1] of a hex color. */
export function lightnessOf(hex: string): number {
  return rgbToHsl(parseHex(hex)).l;
}

/**
 * Relative-lightness adjustment matching the `color` package:
 * `darken(0.1)` multiplies lightness by 0.9, `lighten(0.1)` by 1.1.
 */
export function adjustLightness(hex: string, ratio: number): string {
  const hsl = rgbToHsl(parseHex(hex));
  const l = Math.max(0, Math.min(1, hsl.l * (1 + ratio)));
  return toHex(hslToRgb({ ...hsl, l }));
}

/** Mix `amount` of white into the color (0 = unchanged, 1 = white). */
export function tint(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return toHex({
    r: r + (255 - r) * amount,
    g: g + (255 - g) * amount,
    b: b + (255 - b) * amount,
  });
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const linear = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colors, in [1, 21]. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
