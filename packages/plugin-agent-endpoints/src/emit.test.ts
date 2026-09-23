import { describe, expect, it } from 'vitest';
import {
  type AgentDoc,
  alternateLinkTags,
  DEFAULT_POINTER_TEXT,
  indexPointer,
  injectIntoHead,
  isPlaceholderUrl,
  llmsFullTxt,
  llmsTxt,
  pagesJson,
  stripFrontmatter,
  twinContent,
  twinHref,
  twinRelativePath,
} from './emit.js';

const SITE = {
  url: 'https://wbaxterh.github.io',
  baseUrl: '/pokedocs/',
  title: 'PokeDocs',
  tagline: 'Docs agents can read.',
};

function doc(overrides: Partial<AgentDoc> = {}): AgentDoc {
  return {
    title: 'Architecture',
    description: 'How PokeDocs is structured.',
    permalink: '/pokedocs/architecture',
    markdown:
      '---\ndescription: How PokeDocs is structured.\n---\n\n# Architecture\n\nBody text.\n\n```mermaid\ngraph TB\n  A --> B\n```\n',
    ...overrides,
  };
}

describe('twin paths (S1.5.2)', () => {
  it('maps a permalink to its twin path and href', () => {
    expect(twinRelativePath('/pokedocs/architecture', '/pokedocs/')).toBe(
      'architecture.md',
    );
    expect(twinHref('/pokedocs/architecture', '/pokedocs/')).toBe(
      '/pokedocs/architecture.md',
    );
  });

  it('maps nested and root permalinks', () => {
    expect(twinRelativePath('/pokedocs/adr/0001-mermaid', '/pokedocs/')).toBe(
      'adr/0001-mermaid.md',
    );
    expect(twinRelativePath('/pokedocs/', '/pokedocs/')).toBe('index.md');
    expect(twinRelativePath('/guide', '/')).toBe('guide.md');
    expect(twinRelativePath('/', '/')).toBe('index.md');
  });
});

describe('twin content (S1.5.2)', () => {
  it('strips frontmatter and keeps body, fences, and mermaid source verbatim', () => {
    const twin = twinContent(doc());
    expect(twin.startsWith('# Architecture')).toBe(true);
    expect(twin).not.toContain('---\ndescription');
    expect(twin).toContain('```mermaid\ngraph TB\n  A --> B\n```');
  });

  it('prepends the title as H1 when the body has none', () => {
    const twin = twinContent(
      doc({ markdown: '---\ntitle: Setup\n---\n\nJust prose.\n' }),
    );
    expect(twin.startsWith('# Architecture\n\nJust prose.')).toBe(true);
  });

  it('leaves markdown without frontmatter untouched', () => {
    expect(stripFrontmatter('# Hi\n\ntext')).toBe('# Hi\n\ntext');
  });
});

describe('index pointer (S3.2.3)', () => {
  const pointer = indexPointer(SITE);

  it('names the absolute llms.txt URL in a blockquote', () => {
    expect(pointer).toBe(
      `> **Documentation index:** https://wbaxterh.github.io/pokedocs/llms.txt\n> ${DEFAULT_POINTER_TEXT}\n\n`,
    );
  });

  it('opens the twin, and the page title stays the first heading', () => {
    const twin = twinContent(doc(), pointer);
    expect(twin.startsWith('> **Documentation index:**')).toBe(true);
    expect(twin.match(/^#{1,6} .*$/m)?.[0]).toBe('# Architecture');
    const untitled = twinContent(
      doc({ markdown: '---\ntitle: Setup\n---\n\nJust prose.\n' }),
      pointer,
    );
    expect(untitled.match(/^#{1,6} .*$/m)?.[0]).toBe('# Architecture');
  });

  it('takes a custom instruction line', () => {
    expect(indexPointer(SITE, 'Start here.')).toContain('\n> Start here.\n');
  });

  it('never reaches llms-full.txt', () => {
    expect(llmsFullTxt(SITE, [doc()])).not.toContain('Documentation index');
  });

  it.each(['http://localhost:3000', 'https://your-docs.example.com'])(
    'treats %s as a placeholder',
    (url) => {
      expect(isPlaceholderUrl(url)).toBe(true);
    },
  );

  it('accepts a real site url', () => {
    expect(isPlaceholderUrl('https://wbaxterh.github.io')).toBe(false);
  });
});

describe('llms.txt (S1.5.1)', () => {
  it('follows llmstxt.org conventions with absolute .md URLs and descriptions', () => {
    const output = llmsTxt(SITE, [doc()]);
    expect(output.startsWith('# PokeDocs\n\n> Docs agents can read.\n')).toBe(
      true,
    );
    expect(output).toContain(
      '- [Architecture](https://wbaxterh.github.io/pokedocs/architecture.md): How PokeDocs is structured.',
    );
  });

  it('omits the description suffix when a page has none', () => {
    const output = llmsTxt(SITE, [doc({ description: '' })]);
    expect(output).toContain(
      '- [Architecture](https://wbaxterh.github.io/pokedocs/architecture.md)\n',
    );
  });
});

describe('llms-full.txt (S1.5.1)', () => {
  it('carries every page body with its canonical URL, mermaid intact', () => {
    const output = llmsFullTxt(SITE, [
      doc(),
      doc({
        title: 'Branding',
        permalink: '/pokedocs/branding',
        markdown: '# Branding\n\nOne block.\n',
      }),
    ]);
    expect(output).toContain(
      'URL: https://wbaxterh.github.io/pokedocs/architecture',
    );
    expect(output).toContain('```mermaid\ngraph TB');
    expect(output).toContain('# Branding\n\nOne block.');
    expect(output.split('\n---\n')).toHaveLength(2);
  });
});

describe('validated metadata flows to the surface (S2.2.2)', () => {
  it('appends indexed fields to llms.txt entries', () => {
    const output = llmsTxt(SITE, [
      doc({ fields: { status: 'accepted', owner: 'platform' } }),
    ]);
    expect(output).toContain(
      '): How PokeDocs is structured. (status: accepted; owner: platform)',
    );
  });

  it('emits pages.json with the stable contract shape', () => {
    const output = JSON.parse(
      pagesJson(SITE, [
        doc({ fields: { status: 'accepted' } }),
        doc({ title: 'Plain', permalink: '/pokedocs/plain' }),
      ]),
    );
    expect(output.site).toEqual({
      title: 'PokeDocs',
      url: 'https://wbaxterh.github.io',
    });
    expect(output.pages[0]).toEqual({
      title: 'Architecture',
      description: 'How PokeDocs is structured.',
      path: '/pokedocs/architecture',
      url: 'https://wbaxterh.github.io/pokedocs/architecture',
      markdownUrl: 'https://wbaxterh.github.io/pokedocs/architecture.md',
      fields: { status: 'accepted' },
    });
    expect(output.pages[1].fields).toBeUndefined();
  });
});

describe('discovery links (S1.5.3)', () => {
  it('emits the alternate markdown link for a page', () => {
    expect(alternateLinkTags('/pokedocs/architecture', '/pokedocs/')).toBe(
      '<link rel="alternate" type="text/markdown" href="/pokedocs/architecture.md" title="Markdown version of this page">',
    );
  });

  it('injects before </head> and leaves head-less html alone', () => {
    const html = '<html><head><title>x</title></head><body></body></html>';
    expect(injectIntoHead(html, '<link x>')).toBe(
      '<html><head><title>x</title><link x></head><body></body></html>',
    );
    expect(injectIntoHead('<html><body></body></html>', '<link x>')).toBeNull();
  });
});
