/**
 * @pokedocs/plugin-agent-endpoints — the static agent surface (PRD F1.5, F3.2).
 *
 * Every build emits /llms.txt (indexed page list), /llms-full.txt (full
 * corpus), a .md twin beside every HTML page with mermaid source intact,
 * and <link rel="alternate"> discovery tags. Pure static files: works
 * identically on GitHub Pages, Vercel, Netlify, or nginx.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import {
  type AgentDoc,
  alternateLinkTags,
  injectIntoHead,
  llmsFullTxt,
  llmsTxt,
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

function sourcePathFor(source: string, siteDir: string): string {
  return source.startsWith('@site/')
    ? path.join(siteDir, source.slice('@site/'.length))
    : source;
}

export default function pluginAgentEndpoints(
  context: LoadContext,
  options: AgentEndpointsOptions = {},
): Plugin {
  const emitLlms = options.llmsTxt ?? true;
  const emitTwins = options.markdownTwins ?? true;
  const emitLinks = options.discoveryLinks ?? true;
  const excludeField = options.excludeField ?? 'ingest';

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
        })),
      );

      const site = {
        url,
        baseUrl,
        title: siteConfig.title,
        tagline: siteConfig.tagline,
      };

      if (emitTwins) {
        for (const doc of agentDocs) {
          const target = path.join(
            outDir,
            twinRelativePath(doc.permalink, baseUrl),
          );
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, twinContent(doc));
        }
      }

      if (emitLlms) {
        await writeFile(
          path.join(outDir, 'llms.txt'),
          llmsTxt(site, agentDocs),
        );
        await writeFile(
          path.join(outDir, 'llms-full.txt'),
          llmsFullTxt(site, agentDocs),
        );
      }

      if (emitLinks && emitTwins) {
        for (const doc of agentDocs) {
          const rel = twinRelativePath(doc.permalink, baseUrl).replace(
            /\.md$/,
            '',
          );
          const htmlPath =
            rel === 'index'
              ? path.join(outDir, 'index.html')
              : path.join(outDir, rel, 'index.html');
          const html = await readFile(htmlPath, 'utf8').catch(() => null);
          if (html === null) {
            console.warn(
              `[@pokedocs/plugin-agent-endpoints] no HTML found for ${doc.permalink} at ${htmlPath} — discovery link skipped`,
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
  type AgentDoc,
  alternateLinkTags,
  llmsFullTxt,
  llmsTxt,
  twinContent,
  twinHref,
  twinRelativePath,
} from './emit.js';
