/**
 * Preset option validation (S1.2.2): misconfiguration fails at build
 * start with the bad key named, the expected shape, and an example —
 * never silently at runtime.
 */

import type { PokedocsPresetOptions } from './index.js';

const KNOWN_KEYS = [
  'branding',
  'mermaid',
  'agentEndpoints',
  'frontmatterSchema',
  'search',
  'docs',
  'theme',
] as const;

/** Expected shape + example per option, shown verbatim in errors. */
const OPTION_HELP: Record<(typeof KNOWN_KEYS)[number], string> = {
  branding: `expected { brandColor: string | { light, dark }, logo?: string | { light, dark }, favicon?: string, font?: string, colorMode?: 'light' | 'dark' | 'system' }
  Example:
    presets: [['@pokedocs/preset', { branding: { brandColor: '#D8232A', logo: 'img/logo.svg' } }]]`,
  mermaid: `expected a mermaid options object or false (it is on by default; there is no 'true')
  Example:
    presets: [['@pokedocs/preset', { mermaid: { themeVariables: { primaryColor: '#D8232A' } } }]]`,
  agentEndpoints: `expected { llmsTxt?, markdownTwins?, discoveryLinks?: boolean, excludeField?: string } or false
  Example:
    presets: [['@pokedocs/preset', { agentEndpoints: { excludeField: 'ingest' } }]]`,
  frontmatterSchema: `expected an options object or false
  Example:
    presets: [['@pokedocs/preset', { frontmatterSchema: false }]]`,
  search: `expected true, false, or { engine: 'local' | 'pagefind' }
  Example:
    presets: [['@pokedocs/preset', { search: { engine: 'local' } }]]`,
  docs: `expected a docs-plugin options object (sidebarPath, editUrl, …)
  Example:
    presets: [['@pokedocs/preset', { docs: { sidebarPath: './sidebars.ts' } }]]`,
  theme: `expected { customCss?: string | string[] }
  Example:
    presets: [['@pokedocs/preset', { theme: { customCss: './src/css/custom.css' } }]]`,
};

function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j += 1) {
    rows[0][j] = j;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return rows[a.length][b.length];
}

function nearestKnownKey(key: string): string | undefined {
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const known of KNOWN_KEYS) {
    const distance = editDistance(key.toLowerCase(), known.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      best = known;
    }
  }
  return bestDistance <= 3 ? best : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function show(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

export class PokedocsConfigError extends Error {
  constructor(problems: string[]) {
    super(
      `[@pokedocs/preset] invalid preset options:\n\n${problems.map((p) => `  ${p}`).join('\n\n')}\n`,
    );
    this.name = 'PokedocsConfigError';
  }
}

/**
 * Throws PokedocsConfigError listing every problem at once. Covers all
 * preset options (S1.2.2 acceptance); deep brand-color validity is
 * enforced by compileBranding, which also fails at build start.
 */
export function validatePresetOptions(
  options: unknown,
): asserts options is PokedocsPresetOptions {
  if (options === undefined) {
    return;
  }
  if (!isPlainObject(options)) {
    throw new PokedocsConfigError([
      `expected the preset options to be an object, got ${show(options)}.
  Example:
    presets: [['@pokedocs/preset', { branding: { brandColor: '#D8232A' } }]]`,
    ]);
  }

  const problems: string[] = [];
  const problem = (key: string, detail: string) => {
    problems.push(
      `invalid option \`${key}\`: ${detail}.\n  ${OPTION_HELP[key.split('.')[0] as (typeof KNOWN_KEYS)[number]]}`,
    );
  };

  for (const key of Object.keys(options)) {
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      const suggestion = nearestKnownKey(key);
      problems.push(
        `unknown option \`${key}\`${suggestion ? ` — did you mean \`${suggestion}\`?` : ''} Known options: ${KNOWN_KEYS.join(', ')}.`,
      );
    }
  }

  const {
    branding,
    mermaid,
    agentEndpoints,
    frontmatterSchema,
    search,
    docs,
    theme,
  } = options as Record<string, unknown>;

  if (branding !== undefined) {
    if (!isPlainObject(branding)) {
      problem('branding', `got ${show(branding)}`);
    } else {
      const brandColor = branding.brandColor;
      if (
        typeof brandColor !== 'string' &&
        !(
          isPlainObject(brandColor) &&
          typeof brandColor.light === 'string' &&
          typeof brandColor.dark === 'string'
        )
      ) {
        problem(
          'branding.brandColor',
          `expected a hex color string or { light, dark }, got ${show(brandColor)}`,
        );
      }
      const logo = branding.logo;
      if (
        logo !== undefined &&
        typeof logo !== 'string' &&
        !(
          isPlainObject(logo) &&
          typeof logo.light === 'string' &&
          typeof logo.dark === 'string'
        )
      ) {
        problem('branding.logo', `got ${show(logo)}`);
      }
      if (
        branding.colorMode !== undefined &&
        !['light', 'dark', 'system'].includes(branding.colorMode as string)
      ) {
        problem(
          'branding.colorMode',
          `expected 'light', 'dark', or 'system', got ${show(branding.colorMode)}`,
        );
      }
    }
  }

  if (mermaid !== undefined && mermaid !== false && !isPlainObject(mermaid)) {
    problem('mermaid', `got ${show(mermaid)}`);
  }

  if (agentEndpoints !== undefined && agentEndpoints !== false) {
    if (!isPlainObject(agentEndpoints)) {
      problem('agentEndpoints', `got ${show(agentEndpoints)}`);
    } else {
      for (const flag of ['llmsTxt', 'markdownTwins', 'discoveryLinks']) {
        const value = agentEndpoints[flag];
        if (value !== undefined && typeof value !== 'boolean') {
          problem(
            `agentEndpoints.${flag}`,
            `expected a boolean, got ${show(value)}`,
          );
        }
      }
      if (
        agentEndpoints.excludeField !== undefined &&
        typeof agentEndpoints.excludeField !== 'string'
      ) {
        problem(
          'agentEndpoints.excludeField',
          `expected a frontmatter field name, got ${show(agentEndpoints.excludeField)}`,
        );
      }
    }
  }

  if (frontmatterSchema !== undefined && frontmatterSchema !== false) {
    if (!isPlainObject(frontmatterSchema)) {
      problem('frontmatterSchema', `got ${show(frontmatterSchema)}`);
    } else {
      problems.push(
        'option `frontmatterSchema` is accepted but not implemented yet — it lands with F2.2 (S2.2.1) and will then be on by default. Remove the option for now (or keep `frontmatterSchema: false` to opt out ahead of time).',
      );
    }
  }

  if (search !== undefined && typeof search !== 'boolean') {
    if (!isPlainObject(search)) {
      problem('search', `got ${show(search)}`);
    } else if (search.engine !== 'local' && search.engine !== 'pagefind') {
      problem(
        'search.engine',
        `expected 'local' or 'pagefind', got ${show(search.engine)}`,
      );
    } else if (search.engine === 'pagefind') {
      problems.push(
        "search engine `pagefind` is the reserved large-corpus escape hatch (ADR-0002) and is not implemented yet — use `search: true` or `{ engine: 'local' }`.",
      );
    }
  }

  if (docs !== undefined && !isPlainObject(docs)) {
    problem('docs', `got ${show(docs)}`);
  }
  if (theme !== undefined && !isPlainObject(theme)) {
    problem('theme', `got ${show(theme)}`);
  }

  if (problems.length > 0) {
    throw new PokedocsConfigError(problems);
  }
}
