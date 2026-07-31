import type { LoadContext, Plugin } from '@docusaurus/types';
import { describe, expect, it } from 'vitest';
import pokedocsPreset, { PokedocsConfigError } from './index.js';

/**
 * Minimal stand-in for the context Docusaurus passes after config
 * normalization (the classic preset reads siteConfig.future.v4).
 */
function stubContext(overrides: { favicon?: string } = {}): LoadContext {
  return {
    siteDir: process.cwd(),
    siteConfig: {
      baseUrl: '/pokedocs/',
      favicon: overrides.favicon,
      future: { v4: { useCssCascadeLayers: false } },
      themeConfig: {},
      presets: [],
    },
  } as unknown as LoadContext;
}

type HeadTag = {
  tagName: string;
  attributes?: Record<string, string>;
  innerHTML?: string;
};

function brandingHeadTags(
  options: Parameters<typeof pokedocsPreset>[1],
  context = stubContext(),
): HeadTag[] {
  const { plugins } = pokedocsPreset(context, options);
  const factory = plugins?.find(
    (p): p is () => Plugin =>
      typeof p === 'function' &&
      (p as () => Plugin)().name === 'pokedocs-branding',
  );
  if (!factory) {
    return [];
  }
  const injectHtmlTags = factory().injectHtmlTags;
  const tags = injectHtmlTags?.({ content: undefined }) ?? {};
  return (
    typeof tags === 'object' && 'headTags' in tags ? tags.headTags : []
  ) as HeadTag[];
}

describe('S1.2.1 — one preset, fully wired', () => {
  it('activates classic theme, search, docs, and branding from a single entry', () => {
    const result = pokedocsPreset(stubContext(), {
      branding: { brandColor: '#D8232A' },
    });
    expect(result.themes?.length).toBeGreaterThanOrEqual(2); // classic + search
    const search = result.themes?.find(
      (t) =>
        Array.isArray(t) && String(t[0]).includes('docusaurus-search-local'),
    );
    expect(search).toBeDefined();
    // ADR-0002: docsRouteBasePath must track routeBasePath so pages index.
    expect((search as [string, Record<string, unknown>])[1]).toMatchObject({
      hashed: true,
      docsRouteBasePath: '/',
    });
    expect(
      result.plugins?.some(
        (p) =>
          typeof p === 'function' &&
          (p as () => Plugin)().name === 'pokedocs-branding',
      ),
    ).toBe(true);
  });

  it('wires the mermaid rehype plugin into docs by default and drops it on mermaid: false', () => {
    const docsOptionsOf = (opts: Parameters<typeof pokedocsPreset>[1]) => {
      const { plugins } = pokedocsPreset(stubContext(), opts);
      const docs = plugins?.find(
        (p) => Array.isArray(p) && String(p[0]).includes('plugin-content-docs'),
      ) as [string, { beforeDefaultRehypePlugins?: unknown[] }];
      return docs[1];
    };
    expect(docsOptionsOf({}).beforeDefaultRehypePlugins).toHaveLength(1);
    expect(
      docsOptionsOf({ mermaid: false }).beforeDefaultRehypePlugins,
    ).toHaveLength(0);
  });

  it('omits the search theme on search: false', () => {
    const { themes } = pokedocsPreset(stubContext(), { search: false });
    expect(
      themes?.some(
        (t) =>
          Array.isArray(t) && String(t[0]).includes('docusaurus-search-local'),
      ),
    ).toBe(false);
  });

  it('activates frontmatter schemas by default and derives indexFields (F2.2)', () => {
    const { plugins } = pokedocsPreset(stubContext(), {
      frontmatterSchema: {
        schemas: [
          {
            include: 'adr/**',
            fields: {
              status: {
                type: 'enum',
                values: ['accepted'],
                index: true,
                required: true,
              },
            },
          },
        ],
      },
    });
    const schemaEntry = plugins?.find(
      (p) =>
        Array.isArray(p) &&
        typeof p[0] === 'function' &&
        (p[0] as (c: unknown, o: unknown) => Plugin)(stubContext(), p[1])
          .name === '@pokedocs/plugin-frontmatter-schema',
    );
    expect(schemaEntry).toBeDefined();
    const endpointsEntry = plugins?.find(
      (p) =>
        Array.isArray(p) &&
        typeof p[0] === 'function' &&
        (p[0] as (c: unknown, o: unknown) => Plugin)(stubContext(), p[1])
          .name === '@pokedocs/plugin-agent-endpoints',
    ) as [unknown, { indexFields?: string[] }];
    expect(endpointsEntry[1].indexFields).toEqual(['status']);
  });

  it('activates agent endpoints by default and drops them on false (F1.5)', () => {
    const hasAgentEndpoints = (opts: Parameters<typeof pokedocsPreset>[1]) =>
      pokedocsPreset(stubContext(), opts).plugins?.some(
        (p) =>
          Array.isArray(p) &&
          typeof p[0] === 'function' &&
          (p[0] as (c: unknown, o: unknown) => Plugin)(stubContext(), p[1])
            .name === '@pokedocs/plugin-agent-endpoints',
      );
    expect(hasAgentEndpoints({})).toBe(true);
    expect(hasAgentEndpoints({ agentEndpoints: false })).toBe(false);
  });

  it('injects branding CSS and a favicon link when the site sets no favicon', () => {
    const tags = brandingHeadTags({
      branding: { brandColor: '#D8232A', logo: 'img/logo-badge.svg' },
    });
    expect(tags[0]).toMatchObject({ tagName: 'style' });
    expect(tags[0].innerHTML).toContain('--ifm-color-primary: #d8232a;');
    expect(tags).toContainEqual({
      tagName: 'link',
      attributes: { rel: 'icon', href: '/pokedocs/img/logo-badge.svg' },
    });
  });

  it('defers to an explicit site favicon', () => {
    const tags = brandingHeadTags(
      { branding: { brandColor: '#D8232A', logo: 'img/logo-badge.svg' } },
      stubContext({ favicon: 'img/custom.ico' }),
    );
    expect(tags.some((t) => t.attributes?.rel === 'icon')).toBe(false);
  });

  it('links the Google Fonts stylesheet when branding.font is set', () => {
    const tags = brandingHeadTags({
      branding: { brandColor: '#D8232A', font: 'Source Sans 3' },
    });
    expect(tags).toContainEqual({
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Source+Sans+3&display=swap',
      },
    });
  });

  it('skips the branding plugin entirely without a branding block', () => {
    expect(brandingHeadTags({})).toHaveLength(0);
  });

  it('fails at build start on invalid options (S1.2.2 wiring)', () => {
    expect(() =>
      pokedocsPreset(stubContext(), { search: 'algolia' } as never),
    ).toThrow(PokedocsConfigError);
  });
});
