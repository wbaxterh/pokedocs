/**
 * @pokedocs/plugin-agent-endpoints — the static agent surface (PRD F1.5, F3.2).
 *
 * Every build emits /llms.txt (indexed page list), /llms-full.txt (full
 * corpus), a .md twin beside every HTML page with mermaid source intact,
 * <link rel="alternate"> discovery tags, and the /.well-known discovery
 * files (agent-skills index + SKILL.md, pokedocs.json). Pure static files:
 * works identically on GitHub Pages, Vercel, Netlify, or nginx.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import {
  agentSkillsIndex,
  frontmatterDescription,
  isValidSkillName,
  pokedocsManifest,
  sha256Digest,
  skillDescription,
  skillHref,
  skillMd,
  skillNameFor,
} from './discovery.js';
import {
  type AgentDoc,
  alternateLinkTags,
  indexPointer,
  injectIntoHead,
  isPlaceholderUrl,
  llmsFullTxt,
  llmsTxt,
  pagesJson,
  type SiteInfo,
  twinContent,
  twinRelativePath,
} from './emit.js';

export interface AgentEndpointsOptions {
  /** Emit /llms.txt and /llms-full.txt (S1.5.1). Default true. */
  llmsTxt?: boolean;
  /** Emit a .md twin for every doc page (S1.5.2). Default true. */
  markdownTwins?: boolean;
  /** Add <link rel="alternate"> discovery tags to every page (S1.5.3). Default true. */
  discoveryLinks?: boolean;
  /**
   * Frontmatter field that excludes a page from every agent artifact
   * (twins, corpus, index). Default: "ingest" — pages with `ingest: false`
   * never reach the agent surface.
   */
  excludeField?: string;
  /**
   * Frontmatter fields to emit into llms.txt entries and pages.json
   * (S2.2.2). The preset fills this from schema fields marked
   * `index: true`; values are stringified (dates as YYYY-MM-DD).
   */
  indexFields?: string[];
  /**
   * Open every .md twin with a pointer to llms.txt (S3.2.3). Default true;
   * a string replaces the instruction line. Needs `llmsTxt` and a real
   * site `url`: a pointer at localhost is skipped with a warning.
   */
  indexPointer?: boolean | string;
  /**
   * The agent skill published at /.well-known/agent-skills/ (S3.2.1).
   * `name` defaults to a slug of the site title, `description` to one
   * generated from the title and tagline. A SKILL.md at the same path in
   * `static/` replaces the generated one. `false` skips the skill.
   */
  agentSkill?: false | { name?: string; description?: string };
}

const PACKAGE_NAME = '@pokedocs/plugin-agent-endpoints';

async function generatorId(): Promise<string> {
  const pkg = await readFile(path.join(__dirname, '..', 'package.json'), 'utf8')
    .then((text) => JSON.parse(text) as { version?: string })
    .catch(() => ({ version: undefined }));
  return pkg.version ? `${PACKAGE_NAME}@${pkg.version}` : PACKAGE_NAME;
}

/** The slice of the docs plugin's loaded content this plugin reads. */
interface DocsPluginDoc {
  title: string;
  description: string;
  permalink: string;
  source: string;
  draft: boolean;
  unlisted: boolean;
  frontMatter: Record<string, unknown>;
}

interface DocsPluginContent {
  loadedVersions: { docs: DocsPluginDoc[] }[];
}

const DOCS_PLUGIN_NAME = 'docusaurus-plugin-content-docs';

function includedDocs(
  allContent: Record<string, Record<string, unknown>>,
  excludeField: string,
): DocsPluginDoc[] {
  const instances = Object.values(allContent[DOCS_PLUGIN_NAME] ?? {});
  const docs = instances.flatMap((content) =>
    ((content as DocsPluginContent | undefined)?.loadedVersions ?? []).flatMap(
      (version) => version.docs,
    ),
  );
  return docs
    .filter(
      (doc) =>
        !doc.draft && !doc.unlisted && doc.frontMatter[excludeField] !== false,
    )
    .sort((a, b) => a.permalink.localeCompare(b.permalink));
}

function pickIndexFields(
  frontMatter: Record<string, unknown>,
  indexFields: string[],
): Record<string, string> | undefined {
  if (indexFields.length === 0) {
    return undefined;
  }
  const fields: Record<string, string> = {};
  for (const name of indexFields) {
    const value = frontMatter[name];
    if (value === undefined || value === null) {
      continue;
    }
    fields[name] =
      value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

function sourcePathFor(source: string, siteDir: string): string {
  return source.startsWith('@site/')
    ? path.join(siteDir, source.slice('@site/'.length))
    : source;
}

/**
 * S3.2.1: the agent-skills index (with its SKILL.md) and pokedocs.json.
 * The index digest is taken from the bytes on disk, so a hand-written
 * SKILL.md copied from static/ is hashed exactly as served.
 */
async function writeWellKnown(
  outDir: string,
  site: SiteInfo,
  docs: AgentDoc[],
  skillOption: false | { name?: string; description?: string },
): Promise<void> {
  const wellKnown = path.join(outDir, '.well-known');
  if (skillOption !== false) {
    const name = skillOption.name ?? skillNameFor(site.title);
    const skillPath = path.join(wellKnown, 'agent-skills', name, 'SKILL.md');
    const handWritten = await readFile(skillPath, 'utf8').catch(() => null);
    const description =
      (handWritten === null ? null : frontmatterDescription(handWritten)) ??
      skillOption.description ??
      skillDescription(site, docs.length);
    if (handWritten !== null && frontmatterDescription(handWritten) === null) {
      console.warn(
        `[${PACKAGE_NAME}] no single-line description in ${skillPath}; the agent-skills index uses the configured one, which may not match`,
      );
    }
    if (handWritten === null) {
      await mkdir(path.dirname(skillPath), { recursive: true });
      await writeFile(skillPath, skillMd(site, docs, { name, description }));
    }
    const bytes = await readFile(skillPath);
    await writeFile(
      path.join(wellKnown, 'agent-skills', 'index.json'),
      agentSkillsIndex([
        {
          name,
          description,
          url: skillHref(site.baseUrl, name),
          digest: sha256Digest(bytes),
        },
      ]),
    );
  }
  await mkdir(wellKnown, { recursive: true });
  await writeFile(
    path.join(wellKnown, 'pokedocs.json'),
    pokedocsManifest(site, {
      generator: await generatorId(),
      pageCount: docs.length,
      agentSkills: skillOption !== false,
    }),
  );
}

export default function pluginAgentEndpoints(
  context: LoadContext,
  options: AgentEndpointsOptions = {},
): Plugin {
  const emitLlms = options.llmsTxt ?? true;
  const emitTwins = options.markdownTwins ?? true;
  const emitLinks = options.discoveryLinks ?? true;
  const excludeField = options.excludeField ?? 'ingest';
  const indexFields = options.indexFields ?? [];
  const pointerOption = options.indexPointer ?? true;
  const skillOption = options.agentSkill ?? {};
  if (
    skillOption !== false &&
    skillOption.name !== undefined &&
    !isValidSkillName(skillOption.name)
  ) {
    throw new Error(
      `[${PACKAGE_NAME}] agentSkill.name ${JSON.stringify(skillOption.name)} is not a valid skill name: 1-64 lowercase letters, digits, and single hyphens, not at either end`,
    );
  }

  let docs: DocsPluginDoc[] = [];

  return {
    name: '@pokedocs/plugin-agent-endpoints',

    allContentLoaded({ allContent }) {
      docs = includedDocs(
        allContent as Record<string, Record<string, unknown>>,
        excludeField,
      );
    },

    injectHtmlTags() {
      if (!emitLlms || !emitLinks) {
        return {};
      }
      return {
        headTags: [
          {
            tagName: 'link',
            attributes: {
              rel: 'alternate',
              type: 'text/plain',
              href: `${context.siteConfig.baseUrl}llms.txt`,
              title: 'llms.txt',
            },
          },
        ],
      };
    },

    async postBuild({ outDir, siteConfig, siteDir }) {
      const { url, baseUrl } = siteConfig;
      const agentDocs: AgentDoc[] = await Promise.all(
        docs.map(async (doc) => ({
          title: doc.title,
          description: doc.description,
          permalink: doc.permalink,
          markdown: await readFile(sourcePathFor(doc.source, siteDir), 'utf8'),
          fields: pickIndexFields(doc.frontMatter, indexFields),
        })),
      );

      const site = {
        url,
        baseUrl,
        title: siteConfig.title,
        tagline: siteConfig.tagline,
      };

      if (emitTwins) {
        let pointer = '';
        if (emitLlms && pointerOption !== false) {
          if (isPlaceholderUrl(url)) {
            console.warn(
              `[@pokedocs/plugin-agent-endpoints] site url ${JSON.stringify(url)} is a placeholder; .md twins ship without the llms.txt pointer`,
            );
          } else {
            pointer = indexPointer(
              site,
              typeof pointerOption === 'string' ? pointerOption : undefined,
            );
          }
        }
        for (const doc of agentDocs) {
          const target = path.join(
            outDir,
            twinRelativePath(doc.permalink, baseUrl),
          );
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, twinContent(doc, pointer));
        }
      }

      if (emitLlms) {
        await writeFile(
          path.join(outDir, 'llms.txt'),
          llmsTxt(site, agentDocs),
        );
        await writeFile(
          path.join(outDir, 'pages.json'),
          pagesJson(site, agentDocs),
        );
        await writeFile(
          path.join(outDir, 'llms-full.txt'),
          llmsFullTxt(site, agentDocs),
        );
        await writeWellKnown(outDir, site, agentDocs, skillOption);
      }

      if (emitLinks && emitTwins) {
        for (const doc of agentDocs) {
          const rel = twinRelativePath(doc.permalink, baseUrl).replace(
            /\.md$/,
            '',
          );
          // trailingSlash: undefined/true emits <rel>/index.html;
          // trailingSlash: false emits a flat <rel>.html.
          const candidates =
            rel === 'index'
              ? [path.join(outDir, 'index.html')]
              : [
                  path.join(outDir, rel, 'index.html'),
                  path.join(outDir, `${rel}.html`),
                ];
          let htmlPath = candidates[0];
          let html: string | null = null;
          for (const candidate of candidates) {
            html = await readFile(candidate, 'utf8').catch(() => null);
            if (html !== null) {
              htmlPath = candidate;
              break;
            }
          }
          if (html === null) {
            console.warn(
              `[@pokedocs/plugin-agent-endpoints] no HTML found for ${doc.permalink} (tried ${candidates.join(', ')}) — discovery link skipped`,
            );
            continue;
          }
          const injected = injectIntoHead(
            html,
            alternateLinkTags(doc.permalink, baseUrl),
          );
          if (injected !== null) {
            await writeFile(htmlPath, injected);
          }
        }
      }
    },
  };
}

export {
  AGENT_ARTIFACTS,
  AGENT_SKILLS_SCHEMA,
  agentLinkHeader,
  agentSkillsIndex,
  frontmatterDescription,
  isValidSkillName,
  MANIFEST_VERSION,
  pokedocsManifest,
  sha256Digest,
  skillDescription,
  skillMd,
  skillNameFor,
} from './discovery.js';
export {
  type AgentDoc,
  alternateLinkTags,
  DEFAULT_POINTER_TEXT,
  indexPointer,
  isPlaceholderUrl,
  llmsFullTxt,
  llmsTxt,
  pagesJson,
  twinContent,
  twinHref,
  twinRelativePath,
} from './emit.js';
