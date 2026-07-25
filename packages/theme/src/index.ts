/**
 * @pokedocs/theme — one-line branding and reader-facing components (PRD F1.4, F3.1, F5.1).
 *
 * A schema-validated `branding` block compiles at build time into the full
 * Infima variable set: shade ladders for both color modes, contrast-checked,
 * no custom.css and no swizzling.
 */

export interface BrandingOptions {
  /** Primary brand color (hex). Shade ladders for light/dark modes are derived from it. */
  brandColor: string;
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
