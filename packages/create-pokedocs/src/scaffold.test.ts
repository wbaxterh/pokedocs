import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseCliArgs } from './cli.js';
import { presetVersion, scaffold } from './scaffold.js';

const tempDirs: string[] = [];

async function tempTarget(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'create-pokedocs-test-'));
  tempDirs.push(dir);
  return path.join(dir, 'my-docs');
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function allFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await allFiles(path.join(dir, entry.name), rel)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

describe('S1.1.1 — scaffold a docs-only site', () => {
  it('generates the docs-only tree with no blog, demo cruft, or leftover placeholders', async () => {
    const target = await tempTarget();
    const result = await scaffold({ directory: target, yes: true });

    expect(result.files).toContain('docusaurus.config.ts');
    expect(result.files).toContain('docs/intro.md');
    expect(result.files).toContain('src/pages/index.tsx');
    expect(result.files).toContain('.gitignore');
    expect(result.files).toContain('static/img/logo.svg');

    const files = await allFiles(target);
    expect(files.some((f) => f.includes('blog'))).toBe(false);

    for (const file of files) {
      const content = await readFile(path.join(target, file), 'utf8');
      expect(content, `${file} has leftover placeholder`).not.toMatch(
        /\{\{[A-Z_]+\}\}/,
      );
      expect(content, `${file} has template cruft`).not.toMatch(
        /TODO|FIXME|Delete this|undraw/i,
      );
    }
  });

  it('serves docs at the root path via the preset with a config-driven landing page', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, yes: true });
    const config = await readFile(
      path.join(target, 'docusaurus.config.ts'),
      'utf8',
    );
    expect(config).toContain("'@pokedocs/preset'");
    expect(config).not.toContain('routeBasePath'); // '/' is the preset default
    expect(config).toContain('customFields');
    const landing = await readFile(
      path.join(target, 'src/pages/index.tsx'),
      'utf8',
    );
    expect(landing).toContain('customFields');

    // Every landing card must target a generated doc.
    for (const to of config.matchAll(/to: '\/([a-z-]+)'/g)) {
      expect(
        await readFile(path.join(target, `docs/${to[1]}.md`), 'utf8'),
      ).toBeTruthy();
    }
  });

  it('interpolates site name and brand color everywhere', async () => {
    const target = await tempTarget();
    await scaffold({
      directory: target,
      siteName: 'Helio Docs',
      brandColor: '#FF6B35',
      yes: true,
    });
    const config = await readFile(
      path.join(target, 'docusaurus.config.ts'),
      'utf8',
    );
    // The name is bound to a const and reused, rather than interpolated into
    // each quoted position, so that free text cannot break the syntax.
    expect(config).toContain('const siteName = "Helio Docs";');
    expect(config).toContain('title: siteName');
    expect(config).toContain("brandColor: '#FF6B35'");
    const logo = await readFile(
      path.join(target, 'static/img/logo.svg'),
      'utf8',
    );
    expect(logo).toContain('#FF6B35');
  });

  it('copies a provided logo instead of generating one', async () => {
    const target = await tempTarget();
    const logoSource = path.join(path.dirname(target), 'my-logo.png');
    await writeFile(logoSource, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await scaffold({ directory: target, logo: logoSource, yes: true });
    const copied = await readFile(path.join(target, 'static/img/logo.png'));
    expect([...copied.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const config = await readFile(
      path.join(target, 'docusaurus.config.ts'),
      'utf8',
    );
    expect(config).toContain("logo: 'img/logo.png'");
  });

  it('refuses a non-empty target directory', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, yes: true });
    await expect(scaffold({ directory: target, yes: true })).rejects.toThrow(
      /not empty/,
    );
  });

  it('rejects a bad brand color with a pointed message', async () => {
    await expect(
      scaffold({
        directory: await tempTarget(),
        brandColor: 'blue',
        yes: true,
      }),
    ).rejects.toThrow(/expected a hex color/);
  });
});

describe('free text in the site name and tagline', () => {
  // An apostrophe in either value used to be interpolated straight into a
  // single-quoted TypeScript string, so the generated config did not parse
  // and the scaffold was broken before the first build.
  const hostile = {
    siteName: `Wes's "Docs": a <test> & more \` + \${oops}`,
    tagline: `Prove you didn't paste the keys \\ and don't \${break}`,
  };

  it('escapes both into the generated config without breaking the syntax', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, ...hostile, yes: true });
    const config = await readFile(
      path.join(target, 'docusaurus.config.ts'),
      'utf8',
    );

    // Bound as proper literals, and the raw text never appears unescaped in
    // a quoted position.
    expect(config).toContain(
      `const siteName = ${JSON.stringify(hostile.siteName)};`,
    );
    expect(config).toContain(
      `const tagline = ${JSON.stringify(hostile.tagline)};`,
    );
    expect(config).toContain('title: siteName');
    expect(config).toContain('tagline,');
    expect(config).not.toContain(`'${hostile.siteName}'`);
    expect(config).not.toContain(`'${hostile.tagline}'`);
    // The navbar alt and footer copyright reuse the const inside their
    // template literals, rather than interpolating the raw text, where a
    // backtick or a dollar-brace would otherwise inject.
    expect(config).toMatch(/alt: `\$\{siteName\} logo`/);
    expect(config).toMatch(/getFullYear\(\)\} \$\{siteName\}`/);
  });

  it('escapes the site name into doc frontmatter as a quoted YAML scalar', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, ...hostile, yes: true });
    for (const page of ['docs/intro.md', 'docs/authoring.md']) {
      const body = await readFile(path.join(target, page), 'utf8');
      const description = /^description: (.*)$/m.exec(body)?.[1];
      expect(description).toBeDefined();
      // A colon in the name would end the YAML value early unless the whole
      // scalar is quoted, so it must be, and must parse back out.
      expect(description?.startsWith('"')).toBe(true);
      expect(description?.endsWith('"')).toBe(true);
      expect(JSON.parse(description as string)).toContain(hostile.siteName);
    }
  });

  it('escapes the site name into the generated logo as an XML attribute', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, ...hostile, yes: true });
    const svg = await readFile(
      path.join(target, 'static/img/logo.svg'),
      'utf8',
    );
    // Raw quotes or angle brackets here would close the attribute or the tag.
    expect(svg).toContain('&quot;');
    expect(svg).toContain('&lt;test&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).not.toContain('aria-label="Wes\'s "Docs"');
  });
});

describe('cascade layers', () => {
  it('emits future.v4 so the preset branding is not overridden by Infima', async () => {
    // Without this the compiled brand ladder loses the cascade to the
    // stylesheet bundle and the site silently renders stock Docusaurus blue.
    const target = await tempTarget();
    await scaffold({ directory: target, yes: true });
    const config = await readFile(
      path.join(target, 'docusaurus.config.ts'),
      'utf8',
    );
    expect(config).toMatch(/future:\s*\{\s*v4:\s*true,?\s*\}/);
  });
});

describe('preset pin', () => {
  const repoRoot = path.join(__dirname, '..', '..', '..');

  it('pins the preset at the version released alongside this scaffolder', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, yes: true });
    const site = JSON.parse(
      await readFile(path.join(target, 'package.json'), 'utf8'),
    );
    const own = JSON.parse(
      await readFile(path.join(__dirname, '..', 'package.json'), 'utf8'),
    );
    expect(site.dependencies['@pokedocs/preset']).toBe(`^${own.version}`);
    expect(await presetVersion()).toBe(own.version);
  });

  it('relies on changesets releasing preset and scaffolder as a fixed group', async () => {
    // Without this, the scaffolder's own version stops meaning "the preset
    // it was tested with", and the pin drifts the way ^0.1.0 did.
    const config = JSON.parse(
      await readFile(path.join(repoRoot, '.changeset', 'config.json'), 'utf8'),
    );
    expect(config.fixed).toContainEqual(
      expect.arrayContaining(['@pokedocs/preset', 'create-pokedocs']),
    );
  });
});

describe('S1.1.2 — generated agent authoring scaffold', () => {
  it('generates AGENTS.md with project values and preset-matching conventions', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, siteName: 'Helio Docs', yes: true });
    const agents = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('# Helio Docs — Agent Guide');
    expect(agents).toContain('description:');
    expect(agents).toContain('sidebar_position');
    expect(agents).toContain('mermaid');
    expect(agents).toContain('playwright install chromium');
    expect(agents).toContain('brandColor');
    const claude = await readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    expect(claude.trim()).toBe('@AGENTS.md');
  });
});

describe('S1.1.3 — interactive setup (non-interactive paths)', () => {
  it('scaffolds the GitHub Pages workflow with url/baseUrl derived from owner/repo', async () => {
    const target = await tempTarget();
    await scaffold({
      directory: target,
      deploy: 'github-pages',
      githubOwner: 'wbaxterh',
      yes: true,
    });
    const config = await readFile(
      path.join(target, 'docusaurus.config.ts'),
      'utf8',
    );
    expect(config).toContain(
      "url: process.env.POKEDOCS_URL || 'https://wbaxterh.github.io'",
    );
    expect(config).toContain(
      "baseUrl: process.env.POKEDOCS_BASE_URL || '/my-docs/'",
    );
    const workflow = await readFile(
      path.join(target, '.github/workflows/deploy.yml'),
      'utf8',
    );
    expect(workflow).toContain('actions/deploy-pages');
  });

  it('requires --github-owner for github-pages', async () => {
    await expect(
      scaffold({
        directory: await tempTarget(),
        deploy: 'github-pages',
        yes: true,
      }),
    ).rejects.toThrow(/--github-owner/);
  });

  it('emits no workflow for the default deploy target', async () => {
    const target = await tempTarget();
    await scaffold({ directory: target, yes: true });
    const files = await allFiles(target);
    expect(files.some((f) => f.startsWith('.github'))).toBe(false);
  });

  it('parses the PRD-named flags', () => {
    const { options } = parseCliArgs([
      'my-docs',
      '--brand-color',
      '#123456',
      '--deploy',
      'github-pages',
      '--github-owner',
      'acme',
      '--yes',
    ]);
    expect(options).toMatchObject({
      directory: 'my-docs',
      brandColor: '#123456',
      deploy: 'github-pages',
      githubOwner: 'acme',
      yes: true,
    });
  });

  it('rejects an unknown deploy target at parse time', () => {
    expect(() => parseCliArgs(['my-docs', '--deploy', 'vercel'])).toThrow(
      /invalid --deploy/,
    );
  });

  it('returns help for --help and no options without a directory', () => {
    expect(parseCliArgs(['--help']).help).toBe(true);
    expect(parseCliArgs([]).options).toBeUndefined();
  });
});
