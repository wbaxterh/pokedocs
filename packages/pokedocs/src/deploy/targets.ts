/**
 * `pokedocs deploy init` plumbing (S1.7.1): pluggable targets that emit
 * verified deploy artifacts into an existing site. Each target is pure —
 * files in, files out — so targets are unit-testable and adding one is a
 * single registry entry.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface DeployInitContext {
  /** Absolute site directory. */
  siteDir: string;
  /** The site's base path, e.g. "/" or "/my-docs/". */
  baseUrl: string;
  /** Custom domain (github-pages): writes static/CNAME. */
  domain?: string;
}

export interface EmittedFile {
  /** Path relative to the site dir. */
  path: string;
  content: string;
}

export interface DeployTarget {
  name: string;
  description: string;
  files(context: DeployInitContext): EmittedFile[];
  nextSteps(context: DeployInitContext): string;
}

const CONFIG_FILES = [
  'docusaurus.config.ts',
  'docusaurus.config.js',
  'docusaurus.config.mjs',
];

export async function findSiteConfig(siteDir: string): Promise<string | null> {
  for (const name of CONFIG_FILES) {
    const file = path.join(siteDir, name);
    const found = await readFile(file, 'utf8').then(
      () => file,
      () => null,
    );
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Best-effort baseUrl from the config source: the first string literal on
 * the `baseUrl:` line — which is the fallback in scaffolded configs like
 * `baseUrl: process.env.POKEDOCS_BASE_URL ?? '/my-docs/'`.
 */
export function parseBaseUrl(configSource: string): string | null {
  const match = configSource.match(/baseUrl:[^\n]*?['"`]([^'"`]*)['"`]/);
  return match ? match[1] : null;
}

/** Normalize to leading+trailing slash form ('/', '/my-docs/'). */
export function normalizeBaseUrl(baseUrl: string): string {
  let normalized = baseUrl.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (!normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }
  return normalized;
}
