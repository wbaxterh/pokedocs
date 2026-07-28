/**
 * @pokedocs/preset — the distribution core (PRD F1.2).
 *
 * One preset entry in docusaurus.config activates the PokeDocs theme,
 * build-time mermaid, local search, and agent endpoints. Installing a
 * capability and enabling it are never separate steps.
 */

import type { Options as ClassicOptions } from '@docusaurus/preset-classic';
import classicPreset from '@docusaurus/preset-classic';
import type {
  LoadContext,
  PluginConfig,
  PluginModule,
  Preset,
} from '@docusaurus/types';
import type { AgentEndpointsOptions } from '@pokedocs/plugin-agent-endpoints';
import pluginAgentEndpoints from '@pokedocs/plugin-agent-endpoints';
import type { FrontmatterSchemaOptions } from '@pokedocs/plugin-frontmatter-schema';
import type { MermaidSsrOptions } from '@pokedocs/plugin-mermaid-ssr';
import { rehypeMermaidSsr } from '@pokedocs/plugin-mermaid-ssr';
import type { BrandingOptions } from '@pokedocs/theme';
import { compileBranding } from '@pokedocs/theme';
import { validatePresetOptions } from './validate.js';

export { PokedocsConfigError, validatePresetOptions } from './validate.js';

/** Docs-plugin passthrough: everything the classic preset accepts except `false` — PokeDocs is docs-first. */
export type DocsOptions = Exclude<ClassicOptions['docs'], false | undefined>;

export interface PokedocsPresetOptions {
  /** Brand configuration compiled into the full theme (F1.4). */
  branding?: BrandingOptions;
  /** Build-time mermaid rendering (F1.3). Set false to disable. */
  mermaid?: MermaidSsrOptions | false;
  /** Agent-readable artifacts: llms.txt, .md twins, discovery links (F1.5). Set false to disable. */
  agentEndpoints?: AgentEndpointsOptions | false;
  /** Frontmatter schema validation (F2.2). Set false to disable. */
  frontmatterSchema?: FrontmatterSchemaOptions | false;
  /**
   * Local full-text search, on by default (F1.6). Set false to disable.
   * Default engine per ADR-0002: @easyops-cn/docusaurus-search-local
   * ('local'); 'pagefind' is the large-corpus escape hatch.
   */
  search?: boolean | { engine: SearchEngine };
  /** Docs plugin options (sidebarPath, editUrl, …). `routeBasePath` defaults to '/'. */
  docs?: DocsOptions;
  /** Classic theme options — set customCss for site-specific styling beyond branding. */
  theme?: { customCss?: string | string[] };
}

/** Search engine choices decided by ADR-0002 (S1.6.2). */
export type SearchEngine = 'local' | 'pagefind';
export const DEFAULT_SEARCH_ENGINE: SearchEngine = 'local';

/**
 * Docusaurus preset entry point (S1.2.1): wraps the classic preset with
 * docs-first defaults and activates every implemented PokeDocs
 * capability — each one disabled only by an explicit option.
 */
export default function pokedocsPreset(
  context: LoadContext,
  options: PokedocsPresetOptions = {},
): Preset {
  validatePresetOptions(options);

  const branding = options.branding
    ? compileBranding(options.branding)
    : undefined;

  const docsOptions: DocsOptions = {
    routeBasePath: '/',
    ...options.docs,
    beforeDefaultRehypePlugins: [
      ...(options.mermaid === false
        ? []
        : [[rehypeMermaidSsr, options.mermaid ?? {}] as const]),
      ...(options.docs?.beforeDefaultRehypePlugins ?? []),
    ],
  };

  const classic = classicPreset(context, {
    docs: docsOptions,
    // Docs-first distribution: no blog until a story says otherwise.
    blog: false,
    theme: options.theme,
  });

  const themes = [...(classic.themes ?? [])];
  if (options.search !== false) {
    // Resolved from this package, not the site, so users never install
    // the engine themselves (ADR-0002: activation is the preset's job) —
    // and docsRouteBasePath tracks routeBasePath so pages always index.
    themes.push([
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: docsOptions.routeBasePath ?? '/',
        indexBlog: false,
      },
    ]);
  }

  const plugins = [...(classic.plugins ?? [])];
  if (options.agentEndpoints !== false) {
    // Pillar 4, on by default: llms.txt, .md twins, discovery links (F1.5).
    const entry: PluginConfig = [
      pluginAgentEndpoints as PluginModule,
      { ...options.agentEndpoints },
    ];
    plugins.push(entry);
  }
  if (branding) {
    const { css, favicon, fontStylesheetUrl } = branding;
    const siteHasFavicon = context.siteConfig.favicon !== undefined;
    const baseUrl = context.siteConfig.baseUrl;
    plugins.push(() => ({
      name: 'pokedocs-branding',
      injectHtmlTags: () => ({
        headTags: [
          { tagName: 'style', innerHTML: css },
          ...(favicon && !siteHasFavicon
            ? [
                {
                  tagName: 'link',
                  attributes: {
                    rel: 'icon',
                    href: `${baseUrl}${favicon.replace(/^\//, '')}`,
                  },
                },
              ]
            : []),
          ...(fontStylesheetUrl
            ? [
                {
                  tagName: 'link',
                  attributes: { rel: 'stylesheet', href: fontStylesheetUrl },
                },
              ]
            : []),
        ],
      }),
    }));
  }

  return { themes, plugins };
}
