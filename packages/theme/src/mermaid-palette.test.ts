import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compileMermaidPalette,
  MERMAID_PALETTE_KEYS,
  mermaidPaletteVariable,
} from './mermaid-palette.js';

const stylesheet = fs.readFileSync(
  path.join(__dirname, '..', 'css', 'mermaid-palette.css'),
  'utf8',
);

describe('mermaidPaletteVariable', () => {
  it('kebab-cases the key under the pokedocs-mermaid prefix', () => {
    expect(mermaidPaletteVariable('text')).toBe('--pokedocs-mermaid-text');
    expect(mermaidPaletteVariable('nodeFill')).toBe(
      '--pokedocs-mermaid-node-fill',
    );
    expect(mermaidPaletteVariable('labelBackground')).toBe(
      '--pokedocs-mermaid-label-background',
    );
  });

  it('names a variable the stylesheet actually reads, for every key', () => {
    // An option the CSS never consumes would be a silent no-op.
    for (const key of MERMAID_PALETTE_KEYS) {
      expect(stylesheet).toMatch(
        new RegExp(`var\\(\\s*${mermaidPaletteVariable(key)},`),
      );
    }
  });

  it('never defines a public variable in the stylesheet', () => {
    // The stylesheet only READS --pokedocs-mermaid-*; defining one there
    // would put it in a cascade fight with the injected overrides.
    expect(stylesheet).not.toMatch(/^\s*--pokedocs-mermaid-[a-z-]+\s*:/m);
  });
});

describe('compileMermaidPalette', () => {
  it('emits nothing when no color is set', () => {
    expect(compileMermaidPalette()).toBe('');
    expect(compileMermaidPalette({ light: {}, dark: {} })).toBe('');
  });

  it('scopes each mode to its own selector', () => {
    expect(
      compileMermaidPalette({
        light: { nodeFill: '#eef4ff', nodeStroke: '#1976d2' },
        dark: { nodeFill: '#1c2b3f' },
      }),
    ).toBe(
      [
        ':root {',
        '  --pokedocs-mermaid-node-fill: #eef4ff;',
        '  --pokedocs-mermaid-node-stroke: #1976d2;',
        '}',
        '',
        "[data-theme='dark'] {",
        '  --pokedocs-mermaid-node-fill: #1c2b3f;',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('supports a dark-only override', () => {
    const css = compileMermaidPalette({ dark: { line: 'rgb(180 188 200)' } });
    expect(css).not.toContain(':root');
    expect(css).toContain('--pokedocs-mermaid-line: rgb(180 188 200);');
  });

  it('rejects an unknown key and names the known ones', () => {
    expect(() =>
      compileMermaidPalette({ light: { nodeColor: '#fff' } as never }),
    ).toThrow(/unknown mermaid palette key "nodeColor".*nodeFill/s);
  });

  it('rejects an unknown mode', () => {
    expect(() => compileMermaidPalette({ sepia: {} } as never)).toThrow(
      /unknown mermaid palette mode "sepia"/,
    );
  });

  it.each([
    ['a declaration break', '#fff; color: red'],
    ['a rule break', '#fff } body { display: none'],
    ['a closing tag', '#fff</style><script>'],
    ['a comment', '#fff /* x */'],
    ['an empty string', '  '],
  ])('rejects %s instead of writing it into the page', (_label, value) => {
    expect(() => compileMermaidPalette({ dark: { text: value } })).toThrow(
      /must be a CSS color/,
    );
  });

  it('rejects a non-string value', () => {
    expect(() =>
      compileMermaidPalette({ dark: { text: 42 as never } }),
    ).toThrow(/must be a CSS color/);
  });
});
