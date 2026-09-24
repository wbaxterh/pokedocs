/**
 * Well-known discovery artifacts (S3.2.1): the agent-skills index and its
 * SKILL.md (agentskills.io discovery RFC v0.2.0), and the PokeDocs site
 * manifest. Pure builders, like emit.ts; the plugin does the file I/O.
 */

import { createHash } from 'node:crypto';
import { type AgentDoc, type SiteInfo, twinHref } from './emit.js';

export const AGENT_SKILLS_SCHEMA =
  'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

/** Manifest format version; bump when a field changes meaning or moves. */
export const MANIFEST_VERSION = 1;

/** Above this many pages SKILL.md defers the page list to llms.txt. */
export const SKILL_PAGE_LIST_LIMIT = 50;

/** 1-64 chars, lowercase alphanumeric, single hyphens, none at the ends. */
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSkillName(name: string): boolean {
  return name.length <= 64 && SKILL_NAME.test(name);
}

/** "PokeDocs" → "pokedocs"; "Wes RealDefense Docs!" → "wes-realdefense-docs". */
export function skillNameFor(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // é → e + accent; drop the accent
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
  return slug === '' ? 'docs' : slug;
}

function siteRoot(site: SiteInfo): string {
  return `${site.url}${site.baseUrl}`;
}

export function skillDescription(site: SiteInfo, pageCount: number): string {
  const about = site.tagline ? `${site.title}: ${site.tagline}` : site.title;
  const text = `Use when a task involves ${about.replace(/[.\s]+$/, '')}. Explains how to read its documentation (${pageCount} pages, each available as markdown) so answers come from the docs rather than memory.`;
  return text.length > 1024 ? `${text.slice(0, 1021)}...` : text;
}

/** YAML scalars are quoted whenever they could be misread. */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

/**
 * The generated SKILL.md: frontmatter, then the fetch protocol for this
 * site, then the page list (or a pointer to llms.txt for large sites).
 */
export function skillMd(
  site: SiteInfo,
  docs: AgentDoc[],
  skill: { name: string; description: string },
): string {
  const root = siteRoot(site);
  const example = docs[0]
    ? `${site.url}${twinHref(docs[0].permalink, site.baseUrl)}`
    : `${root}index.md`;
  const lines = [
    '---',
    `name: ${skill.name}`,
    `description: ${yamlString(skill.description)}`,
    '---',
    '',
    `# ${site.title}`,
    '',
  ];
  if (site.tagline) {
    lines.push(site.tagline, '');
  }
  lines.push(
    '## How to read these docs',
    '',
    `1. Fetch the index, ${root}llms.txt: every page with a one-line description.`,
    '2. Pick the page whose description matches the task and fetch its markdown by adding `.md` to the page URL, for example ' +
      `${example}.`,
    `3. When the task spans many pages, ${root}llms-full.txt is the whole corpus in one file.`,
    '',
    `Prefer what these pages say over prior knowledge of ${site.title}; they are the source of truth.`,
    '',
  );
  if (docs.length > SKILL_PAGE_LIST_LIMIT) {
    lines.push(
      `The site has ${docs.length} pages; the full list is in llms.txt.`,
      '',
    );
  } else if (docs.length > 0) {
    lines.push('## Pages', '');
    for (const doc of docs) {
      const url = `${site.url}${twinHref(doc.permalink, site.baseUrl)}`;
      lines.push(
        `- [${doc.title}](${url})${doc.description ? `: ${doc.description}` : ''}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * The `description` of a hand-written SKILL.md, so the index can match it
 * (the RFC says it SHOULD). Handles the single-line scalar forms only;
 * anything fancier returns null and the caller falls back.
 */
export function frontmatterDescription(markdown: string): string | null {
  const block = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = block?.[1].match(/^description:[ \t]*(.+)$/m);
  if (!line) {
    return null;
  }
  const raw = line[1].trim();
  if (raw === '' || raw === '|' || raw === '>' || /^[|>][+-]?$/.test(raw)) {
    return null;
  }
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

export function sha256Digest(content: string | Buffer): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

/** Path of a skill's artifact, rooted at baseUrl so sub-path sites resolve. */
export function skillHref(baseUrl: string, name: string): string {
  return `${baseUrl}.well-known/agent-skills/${name}/SKILL.md`;
}

export function agentSkillsIndex(
  skills: { name: string; description: string; url: string; digest: string }[],
): string {
  const index = {
    $schema: AGENT_SKILLS_SCHEMA,
    skills: skills.map((skill) => ({
      name: skill.name,
      type: 'skill-md',
      description: skill.description,
      url: skill.url,
      digest: skill.digest,
    })),
  };
  return `${JSON.stringify(index, null, 2)}\n`;
}

/**
 * The agent artifacts every build emits, in one list, so the manifest
 * (S3.2.1) and the generated HTTP `Link` headers (S3.2.4) cannot disagree.
 * `rel` values follow the ones hosted docs platforms already send.
 */
export const AGENT_ARTIFACTS = [
  { key: 'llmsTxt', rel: 'llms-txt', file: 'llms.txt' },
  { key: 'llmsFullTxt', rel: 'llms-full-txt', file: 'llms-full.txt' },
  { key: 'pagesJson', rel: null, file: 'pages.json' },
  {
    key: 'agentSkills',
    rel: 'agent-skills',
    file: '.well-known/agent-skills/index.json',
  },
  { key: 'manifest', rel: 'describedby', file: '.well-known/pokedocs.json' },
] as const;

/**
 * Value of the `Link` response header advertising the agent surface, with
 * targets rooted at `baseUrl`. Pass `agentSkills: false` for sites that
 * turned the skill off, so no link points at a missing file.
 */
export function agentLinkHeader(
  baseUrl: string,
  options: { agentSkills?: boolean } = {},
): string {
  return AGENT_ARTIFACTS.filter(
    (artifact) =>
      artifact.rel !== null &&
      (artifact.key !== 'agentSkills' || options.agentSkills !== false),
  )
    .map((artifact) => `<${baseUrl}${artifact.file}>; rel="${artifact.rel}"`)
    .join(', ');
}

/**
 * /.well-known/pokedocs.json: one fetch tells a tool where every agent
 * artifact lives. URLs are absolute; `pokedocs` versions the format.
 */
export function pokedocsManifest(
  site: SiteInfo,
  options: { generator: string; pageCount: number; agentSkills: boolean },
): string {
  const root = siteRoot(site);
  const manifest = {
    pokedocs: MANIFEST_VERSION,
    generator: options.generator,
    site: {
      title: site.title,
      ...(site.tagline ? { tagline: site.tagline } : {}),
      url: root,
    },
    pages: options.pageCount,
    artifacts: {
      ...Object.fromEntries(
        AGENT_ARTIFACTS.filter(
          (artifact) =>
            artifact.key !== 'manifest' &&
            (artifact.key !== 'agentSkills' || options.agentSkills),
        ).map((artifact) => [artifact.key, `${root}${artifact.file}`]),
      ),
      markdownTwins: 'every page URL + ".md"; the root page is index.md',
    },
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
