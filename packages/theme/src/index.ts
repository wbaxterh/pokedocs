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

/**
 * Compile a branding block into CSS custom properties.
 * Implementation lands in M1 (S1.4.1/S1.4.2); the skeleton pins the contract.
 */
export function compileBranding(_options: BrandingOptions): never {
  throw new Error(
    '@pokedocs/theme branding compiler is not implemented yet — tracked by S1.4.1 (github.com/wbaxterh/pokedocs/issues).',
  );
}
