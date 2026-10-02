import { describe, expect, it } from 'vitest';
import { type CorpusPage, DocsCorpus, splitCommand } from './corpus.js';

const POINTER =
  '> **Documentation index:** https://x.dev/llms.txt\n> Use this file to discover all available pages before exploring further.\n\n';

function page(
  path: string,
  title: string,
  body: string,
  description = '',
): CorpusPage {
  return {
    path,
    title,
    description,
    markdown: `${POINTER}# ${title}\n\n${body}\n`,
  };
}

const corpus = new DocsCorpus([
  page(
    '/hosting.md',
    'Hosting',
    'Deploy with Docker and nginx.\n\nThe baseUrl footgun is gone.',
    'Host anywhere',
  ),
  page(
    '/branding.md',
    'Branding',
    'One brandColor compiles the whole theme.\n\nDark mode is lifted, never darkened.',
    'One hex code',
  ),
  page(
    '/adr/0001-mermaid.md',
    'ADR 0001: Mermaid at build time',
    'We render mermaid diagrams to SVG.',
  ),
]);

describe('search', () => {
  it('ranks the page whose title matches above body-only matches', () => {
    const hits = corpus.search('branding dark mode');
    expect(hits[0].path).toBe('/branding.md');
    expect(hits[0].snippet).toMatch(/Dark mode|brandColor/);
    expect(hits[0].snippet).not.toContain('Documentation index');
  });

  it('returns nothing for stopwords or unknown words', () => {
    expect(corpus.search('the of and')).toEqual([]);
    expect(corpus.search('kubernetes')).toEqual([]);
  });

  it('caps the limit at 25', () => {
    expect(corpus.search('mermaid', 100).length).toBeLessThanOrEqual(25);
  });
});

describe('query: ls, cat, head', () => {
  it('lists the root with directories marked', () => {
    expect(corpus.query('ls /').text).toBe('adr/\nbranding.md\nhosting.md');
    expect(corpus.query('ls adr').text).toBe('0001-mermaid.md');
  });

  it('reads a file with or without the .md, and .mdx maps to the twin', () => {
    for (const path of ['/branding.md', 'branding', '/branding.mdx']) {
      expect(corpus.query(`cat ${path}`).text).toContain('# Branding');
    }
  });

  it('heads a file in every common -n spelling', () => {
    const expected = POINTER.split('\n').slice(0, 2).join('\n');
    for (const cmd of [
      'head -n 2 /hosting.md',
      'head -n2 /hosting.md',
      'head -2 /hosting.md',
    ]) {
      expect(corpus.query(cmd).text).toBe(expected);
    }
  });

  it('cannot leave the tree: .. stops at the root', () => {
    expect(corpus.query('cat ../../../etc/passwd')).toEqual({
      text: 'cat: ../../../etc/passwd: no such file',
      isError: true,
    });
    expect(corpus.query('ls ../..').text).toContain('branding.md');
  });

  it('reports errors as text the agent can act on', () => {
    expect(corpus.query('rm -rf /')).toMatchObject({ isError: true });
    expect(corpus.query('rm -rf /').text).toContain('Available: ls');
    expect(corpus.query('cat /missing.md').isError).toBe(true);
    expect(corpus.query('head -n 0 /hosting.md').isError).toBe(true);
  });
});

describe('query: grep', () => {
  it('prints path:line:text, recursively from the root by default', () => {
    expect(corpus.query('grep -i "DARK MODE"').text).toBe(
      // Line 8: the 3-line pointer, the H1, a blank, a paragraph, a blank.
      '/branding.md:8:Dark mode is lifted, never darkened.',
    );
  });

  it('lists files only with -l and scopes to a directory', () => {
    expect(corpus.query('grep -l mermaid /adr').text).toBe(
      '/adr/0001-mermaid.md',
    );
  });

  it('falls back to a literal match when the pattern is not a valid regex', () => {
    expect(corpus.query('grep "brandColor ("').text).toBe('(no matches)');
    expect(corpus.query('grep "(" /').isError).toBe(false);
  });

  it('rejects flags it does not implement instead of ignoring them', () => {
    expect(corpus.query('grep -v x /').text).toContain('unsupported flag -v');
  });
});

describe('command parsing', () => {
  it('honours quotes and refuses pipes and redirects', () => {
    expect(splitCommand(`grep -i 'base url' /`)).toEqual([
      'grep',
      '-i',
      'base url',
      '/',
    ]);
    expect(() => splitCommand('cat /a.md | head')).toThrow(
      /one command per call/,
    );
    expect(() => splitCommand('cat "/a.md')).toThrow(/unclosed quote/);
    expect(corpus.query('cat /hosting.md > /tmp/x').isError).toBe(true);
  });
});
