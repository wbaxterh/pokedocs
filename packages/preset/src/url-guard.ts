/**
 * The baseUrl footgun guard (S1.7.3): a production build that still
 * carries a localhost or placeholder site url is the classic shipped-docs
 * bug — canonical URLs, sitemaps, and llms.txt all point at a URL that
 * doesn't exist. Warn loudly by default; POKEDOCS_STRICT_URL=true makes
 * it a build error.
 */

import { PokedocsConfigError } from './validate.js';

/** localhost in any spelling, and the RFC 2606 example domains. */
const PLACEHOLDER_URL =
  /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?([/?#]|$)|(\/\/|\.)example\.(com|org|net)([/?#]|$)/i;

export interface UrlGuardEnv {
  /** True for `docusaurus build` (NODE_ENV=production). */
  isProduction: boolean;
  /** POKEDOCS_STRICT_URL=true|1 escalates the warning to an error. */
  strict: boolean;
  logger?: (message: string) => void;
}

export function isPlaceholderUrl(url: string): boolean {
  return PLACEHOLDER_URL.test(url);
}

export function checkSiteUrl(url: string, env: UrlGuardEnv): void {
  if (!env.isProduction || !isPlaceholderUrl(url)) {
    return;
  }
  const message = [
    `production build with a placeholder site url: ${JSON.stringify(url)}`,
    '',
    '  Canonical URLs, the sitemap, and llms.txt will all point at a URL that',
    '  does not exist. Set `url` (and `baseUrl`) in docusaurus.config.ts, or',
    '  export POKEDOCS_URL / POKEDOCS_BASE_URL if your config reads them from',
    '  the environment (sites scaffolded by create-pokedocs do).',
  ].join('\n');

  if (env.strict) {
    throw new PokedocsConfigError([
      `${message}\n\n  (POKEDOCS_STRICT_URL is set — placeholder URLs fail the build.)`,
    ]);
  }
  (env.logger ?? console.warn)(
    `\n[@pokedocs/preset] WARNING: ${message}\n\n  Set POKEDOCS_STRICT_URL=true to make this an error.\n`,
  );
}
