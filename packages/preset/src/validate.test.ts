import { describe, expect, it } from 'vitest';
import { PokedocsConfigError, validatePresetOptions } from './validate.js';

function failure(options: unknown): string {
  try {
    validatePresetOptions(options);
  } catch (error) {
    expect(error).toBeInstanceOf(PokedocsConfigError);
    return (error as Error).message;
  }
  throw new Error('expected validation to fail');
}

describe('S1.2.2 — config validation with human errors', () => {
  it('accepts undefined, empty, and a fully-populated valid config', () => {
    expect(() => validatePresetOptions(undefined)).not.toThrow();
    expect(() => validatePresetOptions({})).not.toThrow();
    expect(() =>
      validatePresetOptions({
        branding: {
          brandColor: '#D8232A',
          logo: { light: 'a.svg', dark: 'b.svg' },
          colorMode: 'system',
        },
        mermaid: { preserveSource: true },
        agentEndpoints: false,
        frontmatterSchema: false,
        search: { engine: 'local' },
        docs: { sidebarPath: './sidebars.ts' },
        theme: { customCss: './custom.css' },
      }),
    ).not.toThrow();
  });

  it('names an unknown key and suggests the nearest known one', () => {
    const message = failure({ brandign: { brandColor: '#fff' } });
    expect(message).toContain('unknown option `brandign`');
    expect(message).toContain('did you mean `branding`?');
  });

  it('lists the known options for an unrecognizable key', () => {
    const message = failure({ analytics: true });
    expect(message).toContain('unknown option `analytics`');
    expect(message).toContain('branding, mermaid');
  });

  it('names the bad key with expected shape and example for a wrong-typed option', () => {
    const message = failure({ search: 'algolia' });
    expect(message).toContain('invalid option `search`');
    expect(message).toContain(
      "expected true, false, or { engine: 'local' | 'pagefind' }",
    );
    expect(message).toContain('"algolia"');
    expect(message).toContain(
      "presets: [['@pokedocs/preset', { search: { engine: 'local' } }]]",
    );
  });

  it('rejects mermaid: true — the option is object-or-false', () => {
    const message = failure({ mermaid: true });
    expect(message).toContain('invalid option `mermaid`');
    expect(message).toContain("there is no 'true'");
  });

  it('rejects a missing brandColor inside branding', () => {
    const message = failure({ branding: { logo: 'img/logo.svg' } });
    expect(message).toContain('invalid option `branding.brandColor`');
    expect(message).toContain('expected a hex color string');
  });

  it('rejects a bad colorMode with the allowed values', () => {
    const message = failure({
      branding: { brandColor: '#fff', colorMode: 'auto' },
    });
    expect(message).toContain('invalid option `branding.colorMode`');
    expect(message).toContain("'light', 'dark', or 'system'");
  });

  it('rejects an unknown search engine, and pagefind as not-yet-implemented', () => {
    expect(failure({ search: { engine: 'algolia' } })).toContain(
      "expected 'local' or 'pagefind'",
    );
    const pagefind = failure({ search: { engine: 'pagefind' } });
    expect(pagefind).toContain('escape hatch');
    expect(pagefind).toContain('ADR-0002');
  });

  it('rejects enabling not-yet-implemented features, pointing at the landing story', () => {
    const message = failure({ agentEndpoints: {} });
    expect(message).toContain('`agentEndpoints`');
    expect(message).toContain('F1.5');
    expect(failure({ frontmatterSchema: {} })).toContain('F2.2');
  });

  it('reports every problem at once', () => {
    const message = failure({
      brandign: {},
      search: 'algolia',
      mermaid: true,
    });
    expect(message).toContain('unknown option `brandign`');
    expect(message).toContain('invalid option `search`');
    expect(message).toContain('invalid option `mermaid`');
  });

  it('rejects non-object options entirely', () => {
    expect(failure('branding')).toContain(
      'expected the preset options to be an object',
    );
  });
});
