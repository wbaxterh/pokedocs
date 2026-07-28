import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEPLOY_TARGETS, runDeployInit } from './init.js';
import { normalizeBaseUrl, parseBaseUrl } from './targets.js';

const tempDirs: string[] = [];

async function siteDir(baseUrl = '/'): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pokedocs-deploy-test-'));
  tempDirs.push(dir);
  await writeFile(
    path.join(dir, 'docusaurus.config.ts'),
    `const config = {\n  url: process.env.POKEDOCS_URL ?? 'https://docs.example.com',\n  baseUrl: process.env.POKEDOCS_BASE_URL ?? '${baseUrl}',\n};\nexport default config;\n`,
  );
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('S1.7.1 — deploy init plumbing', () => {
  it('exposes a pluggable target registry', () => {
    expect(DEPLOY_TARGETS.map((t) => t.name)).toEqual([
      'github-pages',
      'docker',
    ]);
    for (const target of DEPLOY_TARGETS) {
      expect(typeof target.files).toBe('function');
      expect(typeof target.nextSteps).toBe('function');
    }
  });

  it('names available targets on an unknown target', async () => {
    await expect(runDeployInit('vercel', await siteDir())).rejects.toThrow(
      /unknown deploy target "vercel"[\s\S]*github-pages[\s\S]*docker/,
    );
  });

  it('refuses to run outside a site directory', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'pokedocs-nosite-'));
    tempDirs.push(dir);
    await expect(runDeployInit('docker', dir)).rejects.toThrow(
      /no docusaurus\.config/,
    );
  });

  it('refuses to overwrite differing files without --force', async () => {
    const dir = await siteDir();
    await runDeployInit('docker', dir);
    await writeFile(path.join(dir, 'nginx.conf'), 'hand-edited\n');
    await expect(runDeployInit('docker', dir)).rejects.toThrow(/--force/);
    const { written } = await runDeployInit('docker', dir, { force: true });
    expect(written).toContain('nginx.conf');
  });

  it('scaffolds the Pages workflow with .nojekyll, and CNAME only with a domain', async () => {
    const dir = await siteDir();
    const result = await runDeployInit('github-pages', dir);
    expect(result.written).toEqual([
      '.github/workflows/deploy.yml',
      'static/.nojekyll',
    ]);
    const workflow = await readFile(
      path.join(dir, '.github/workflows/deploy.yml'),
      'utf8',
    );
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('upload-pages-artifact');
    expect(workflow).toContain('playwright install --with-deps chromium');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: asserting the literal GitHub Actions expression survives into the workflow
    expect(workflow).toContain("${{ hashFiles('package-lock.json') }}");

    const withDomain = await runDeployInit('github-pages', dir, {
      domain: 'docs.acme.dev',
      force: true,
    });
    expect(withDomain.written).toContain('static/CNAME');
    expect(await readFile(path.join(dir, 'static/CNAME'), 'utf8')).toBe(
      'docs.acme.dev\n',
    );
    expect(withDomain.nextSteps).toContain('https://docs.acme.dev');
  });
});

describe('S1.7.2 — docker target', () => {
  it('emits a multi-stage Dockerfile with chromium and a non-root runtime', async () => {
    const dir = await siteDir();
    await runDeployInit('docker', dir);
    const dockerfile = await readFile(path.join(dir, 'Dockerfile'), 'utf8');
    expect(dockerfile).toContain('AS builder');
    expect(dockerfile).toContain('playwright install --with-deps chromium');
    expect(dockerfile).toContain('nginx-unprivileged');
    expect(dockerfile).toContain(
      'COPY --from=builder /site/build /usr/share/nginx/html\n',
    );
    const dockerignore = await readFile(
      path.join(dir, '.dockerignore'),
      'utf8',
    );
    expect(dockerignore).toContain('node_modules');
  });

  it('derives nginx try_files and copy path from the configured baseUrl', async () => {
    const dir = await siteDir('/my-docs/');
    await runDeployInit('docker', dir);
    const nginx = await readFile(path.join(dir, 'nginx.conf'), 'utf8');
    expect(nginx).toContain('location /my-docs/ {');
    expect(nginx).toContain('try_files $uri $uri/ =404;');
    expect(nginx).toContain('error_page 404 /my-docs/404.html;');
    expect(nginx).toContain('return 302 /my-docs/;');
    const dockerfile = await readFile(path.join(dir, 'Dockerfile'), 'utf8');
    expect(dockerfile).toContain('/usr/share/nginx/html/my-docs\n');
  });

  it('honors a --base-url override over the config', async () => {
    const dir = await siteDir('/from-config/');
    await runDeployInit('docker', dir, { baseUrl: '/override/' });
    const nginx = await readFile(path.join(dir, 'nginx.conf'), 'utf8');
    expect(nginx).toContain('location /override/ {');
  });
});

describe('baseUrl helpers', () => {
  it('parses the literal fallback from an env-reading scaffolded config', () => {
    expect(
      parseBaseUrl("baseUrl: process.env.POKEDOCS_BASE_URL ?? '/my-docs/',"),
    ).toBe('/my-docs/');
    expect(parseBaseUrl("baseUrl: '/plain/',")).toBe('/plain/');
    expect(parseBaseUrl('title: "no base url here",')).toBeNull();
  });

  it('normalizes to leading and trailing slashes', () => {
    expect(normalizeBaseUrl('my-docs')).toBe('/my-docs/');
    expect(normalizeBaseUrl('/my-docs')).toBe('/my-docs/');
    expect(normalizeBaseUrl('/')).toBe('/');
  });
});
