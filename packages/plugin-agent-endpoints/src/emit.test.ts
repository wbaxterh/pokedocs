import { describe, expect, it } from 'vitest';
import {
  type AgentDoc,
  alternateLinkTags,
  injectIntoHead,
  llmsFullTxt,
  llmsTxt,
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
