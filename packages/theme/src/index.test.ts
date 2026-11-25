import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pokedocsThemeComponents, THEME_COMPONENTS_PATH } from './index.js';

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
