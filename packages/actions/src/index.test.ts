import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_NAMES, templatesDir } from './index.js';

describe('@pokedocs/actions', () => {
  it('resolves the bundled templates directory', () => {
    expect(fs.existsSync(templatesDir())).toBe(true);
  });

  it('pins the PRD template set', () => {
    expect(TEMPLATE_NAMES).toContain('drift-check');
    expect(TEMPLATE_NAMES).toContain('deploy-github-pages');
  });
});
