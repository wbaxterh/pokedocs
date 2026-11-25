import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MERMAID_PALETTE_CSS,
  pokedocsThemeComponents,
  THEME_COMPONENTS_PATH,
} from './index.js';

describe('pokedocsThemeComponents (S5.1.1)', () => {
  it('points Docusaurus at the theme component directory', () => {
    const plugin = pokedocsThemeComponents();
    expect(plugin.name).toBe('pokedocs-theme-components');
    expect(plugin.getThemePath?.()).toBe(THEME_COMPONENTS_PATH);
    expect(path.isAbsolute(THEME_COMPONENTS_PATH)).toBe(true);
  });

  it('ships exactly the components it means to alias', () => {
    // Docusaurus turns EVERY source file under the theme path into an
    // `@theme/*` alias, so helpers must live outside it.
    const dir = path.join(__dirname, 'client', 'theme');
    expect(fs.readdirSync(dir).sort()).toEqual([
      'MDXComponents',
      'PokedocsMermaid',
    ]);
  });

  it('keeps the stylesheets where the compiled components import them', () => {
    // src/ and dist/ sit at the same depth, so one relative path serves both.
    for (const file of ['mermaid.css', 'mermaid-viewer.css']) {
      expect(fs.existsSync(path.join(__dirname, '..', 'css', file))).toBe(true);
    }
  });
});

describe('diagram palette wiring (S5.1.2)', () => {
  const headTags = (plugin: ReturnType<typeof pokedocsThemeComponents>) =>
    (plugin.injectHtmlTags?.({ content: undefined }) ?? {}) as {
      headTags?: { tagName: string; innerHTML: string }[];
    };

  it('loads the palette stylesheet by default, with nothing injected', () => {
    const plugin = pokedocsThemeComponents();
    expect(plugin.getClientModules?.()).toEqual([MERMAID_PALETTE_CSS]);
    expect(fs.existsSync(MERMAID_PALETTE_CSS)).toBe(true);
    expect(headTags(plugin)).toEqual({});
  });

  it('injects per-mode overrides as custom properties', () => {
    const plugin = pokedocsThemeComponents(undefined, {
      palette: { dark: { nodeFill: '#1c2b3f' } },
    });
    expect(plugin.getClientModules?.()).toEqual([MERMAID_PALETTE_CSS]);
    const [style] = headTags(plugin).headTags ?? [];
    expect(style.tagName).toBe('style');
    expect(style.innerHTML).toContain("[data-theme='dark']");
    expect(style.innerHTML).toContain('--pokedocs-mermaid-node-fill: #1c2b3f;');
  });

  it('ships no palette stylesheet on palette: false', () => {
    const plugin = pokedocsThemeComponents(undefined, { palette: false });
    expect(plugin.getClientModules?.()).toEqual([]);
    expect(headTags(plugin)).toEqual({});
  });

  it('fails at plugin creation on a bad palette', () => {
    expect(() =>
      pokedocsThemeComponents(undefined, {
        palette: { dark: { nope: '#fff' } as never },
      }),
    ).toThrow(/unknown mermaid palette key/);
  });
});
