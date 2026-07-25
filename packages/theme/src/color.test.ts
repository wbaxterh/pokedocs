import { describe, expect, it } from 'vitest';
import {
  adjustLightness,
  contrastRatio,
  parseHex,
  rgbToHsl,
  tint,
  toHex,
} from './color.js';

describe('parseHex/toHex', () => {
  it('round-trips six-digit hex', () => {
    expect(toHex(parseHex('#D8232A'))).toBe('#d8232a');
  });

  it('expands three-digit hex', () => {
    expect(toHex(parseHex('#D82'))).toBe('#dd8822');
  });

  it('rejects non-hex input with a pointed message', () => {
    expect(() => parseHex('red')).toThrow(/expected a hex color/);
    expect(() => parseHex('#12345')).toThrow(/expected a hex color/);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#d8232a', '#1b1b1d')).toBe(
      contrastRatio('#1b1b1d', '#d8232a'),
    );
  });

  it('matches the canonical mid-gray AA boundary', () => {
    // #767676 on white is the classic "just passes AA" pair (~4.54:1).
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThan(4.5);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
  });
});

describe('adjustLightness', () => {
  it('multiplies HSL lightness relatively, like the color package', () => {
    const base = rgbToHsl(parseHex('#25c2a0')).l;
    const darkened = rgbToHsl(parseHex(adjustLightness('#25c2a0', -0.1))).l;
    expect(darkened).toBeCloseTo(base * 0.9, 2);
  });

  it('clamps at the extremes', () => {
    expect(adjustLightness('#ffffff', 0.3)).toBe('#ffffff');
    expect(adjustLightness('#000000', -0.3)).toBe('#000000');
  });
});

describe('tint', () => {
  it('mixes toward white in RGB', () => {
    expect(tint('#000000', 0.5)).toBe('#808080');
    expect(tint('#d8232a', 0)).toBe('#d8232a');
    expect(tint('#d8232a', 1)).toBe('#ffffff');
  });
});
