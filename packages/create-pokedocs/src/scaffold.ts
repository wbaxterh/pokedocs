/**
 * The scaffolder core (S1.1.1–S1.1.3): copies the template tree with
 * placeholder interpolation, generates a brand-colored default logo, and
 * emits the agent authoring scaffold. Pure Node, no dependencies.
 */

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { ScaffoldOptions } from './index.js';

export interface ScaffoldResult {
  /** Absolute path of the generated site. */
  directory: string;
  /** Files written, relative to the site directory. */
  files: string[];
}

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
/** Placeholders are strictly {{UPPER_SNAKE}} so GitHub's ${{ … }} never collides. */
const PLACEHOLDER = /\{\{([A-Z_]+)\}\}/g;

export const SCAFFOLD_DEFAULTS = {
  brandColor: '#2EA8E0',
  deploy: 'none',
} as const;

class ScaffoldError extends Error {}

/** npm-safe package name from the target directory's basename. */
function packageNameFor(directory: string): string {
  const name = path
    .basename(directory)
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return name || 'my-docs';
}

function defaultLogoSvg(brandColor: string, siteName: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${siteName} logo">
  <rect width="128" height="128" rx="26" fill="${brandColor}"/>
  <circle cx="64" cy="64" r="34" fill="#ffffff" opacity="0.92"/>
  <circle cx="52" cy="52" r="10" fill="${brandColor}" opacity="0.45"/>
</svg>
`;
}

function interpolate(
  content: string,
  vars: Record<string, string>,
  source: string,
): string {
  return content.replace(PLACEHOLDER, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      throw new ScaffoldError(
        `internal template error: ${source} references unknown placeholder ${match} — please report this at github.com/wbaxterh/pokedocs/issues`,
      );
    }
    return value;
  });
}

async function templateFiles(
  dir = TEMPLATE_DIR,
  prefix = '',
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await templateFiles(path.join(dir, entry.name), rel)));
    } else {
      files.push(rel);
    }
  }
  return files;
}

/** Template path → generated path, or null to skip. */
function targetPathFor(
  rel: string,
  deploy: ScaffoldOptions['deploy'],
): string | null {
  if (rel.startsWith('workflows/')) {
    return deploy === 'github-pages' ? '.github/workflows/deploy.yml' : null;
  }
  const stripped = rel.replace(/\.tmpl$/, '');
  return stripped === 'gitignore' ? '.gitignore' : stripped;
}

async function assertTargetUsable(directory: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw new ScaffoldError(
      `target ${directory} is not a usable directory (${String(error)})`,
    );
  }
  if (entries.length > 0) {
    throw new ScaffoldError(
      `target directory ${directory} already exists and is not empty — pick a new directory or empty it first.`,
    );
  }
}

export async function scaffold(
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  if (!options.directory) {
    throw new ScaffoldError(
      'a target directory is required: create-pokedocs <directory>',
    );
  }
  const directory = path.resolve(options.directory);
  const siteName = options.siteName?.trim() || path.basename(directory);
  const tagline = options.tagline?.trim() || `${siteName} documentation`;
  const brandColor = options.brandColor ?? SCAFFOLD_DEFAULTS.brandColor;
  const deploy = options.deploy ?? SCAFFOLD_DEFAULTS.deploy;

  if (!HEX_COLOR.test(brandColor)) {
    throw new ScaffoldError(
      `invalid brand color ${JSON.stringify(brandColor)} — expected a hex color like "#2EA8E0".`,
    );
  }
  if (!['github-pages', 'docker', 'none'].includes(deploy)) {
    throw new ScaffoldError(
      `invalid deploy target ${JSON.stringify(deploy)} — expected github-pages, docker, or none.`,
    );
  }

  let logoExt = '.svg';
  if (options.logo) {
    logoExt = path.extname(options.logo).toLowerCase();
    if (!['.svg', '.png'].includes(logoExt)) {
      throw new ScaffoldError(
        `logo must be an .svg or .png file, got ${JSON.stringify(options.logo)}.`,
      );
    }
    await readFile(options.logo).catch(() => {
      throw new ScaffoldError(`logo file not found: ${options.logo}`);
    });
  }
  const logoPath = `img/logo${logoExt}`;

  let url = 'https://docs.example.com';
  let baseUrl = '/';
  if (deploy === 'github-pages') {
    const owner = options.githubOwner?.trim();
    const repo = options.githubRepo?.trim() || packageNameFor(directory);
    if (!owner) {
      throw new ScaffoldError(
        'deploying to GitHub Pages needs the repository owner: pass --github-owner <user-or-org>.',
      );
    }
    url = `https://${owner}.github.io`;
    baseUrl = `/${repo}/`;
  }

  const vars: Record<string, string> = {
    SITE_NAME: siteName,
    TAGLINE: tagline,
    PKG_NAME: packageNameFor(directory),
    BRAND_COLOR: brandColor,
    LOGO_PATH: logoPath,
    URL: url,
    BASE_URL: baseUrl,
  };

  await assertTargetUsable(directory);

  const files: string[] = [];
  for (const rel of await templateFiles()) {
    const target = targetPathFor(rel, deploy);
    if (target === null) {
      continue;
    }
    const content = await readFile(path.join(TEMPLATE_DIR, rel), 'utf8');
    const rendered = interpolate(content, vars, rel);
    await mkdir(path.join(directory, path.dirname(target)), {
      recursive: true,
    });
    await writeFile(path.join(directory, target), rendered);
    files.push(target);
  }

  const logoTarget = path.join(directory, 'static', logoPath);
  await mkdir(path.dirname(logoTarget), { recursive: true });
  if (options.logo) {
    await copyFile(options.logo, logoTarget);
  } else {
    await writeFile(logoTarget, defaultLogoSvg(brandColor, siteName));
  }
  files.push(`static/${logoPath}`);

  return { directory, files: files.sort() };
}
