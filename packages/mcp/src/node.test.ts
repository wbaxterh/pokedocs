import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DocsLoadError, loadCorpus, serveDocsHttp } from './node.js';

let buildDir: string;
let server: Server;
let endpoint: URL;

beforeAll(async () => {
  // A miniature PokeDocs build: twins, pages.json, a manifest, and a
  // SKILL.md under .well-known that must NOT become a page.
  buildDir = await mkdtemp(path.join(os.tmpdir(), 'pokedocs-mcp-test-'));
  const file = async (rel: string, content: string) => {
    await mkdir(path.dirname(path.join(buildDir, rel)), { recursive: true });
    await writeFile(path.join(buildDir, rel), content);
  };
  await file('index.md', '# Acme Docs\n\nWelcome.\n');
  await file(
    'guide/setup.md',
    '# Setup\n\nInstall with npm. Set the baseUrl.\n',
  );
  await file(
    '.well-known/agent-skills/acme/SKILL.md',
    '---\nname: acme\n---\n# Skill\n',
  );
  await file(
    'pages.json',
    JSON.stringify({
      site: { title: 'Acme', url: 'https://acme.dev' },
      pages: [
        {
          title: 'Getting set up',
          description: 'Install and configure',
          path: '/docs/guide/setup',
          url: 'https://acme.dev/docs/guide/setup',
          markdownUrl: 'https://acme.dev/docs/guide/setup.md',
        },
      ],
    }),
  );
  await file(
    '.well-known/pokedocs.json',
    JSON.stringify({ site: { title: 'Acme Docs' } }),
  );

  const { corpus, siteTitle } = await loadCorpus(buildDir);
  server = await serveDocsHttp(
    corpus,
    { siteTitle, version: '0.0.0-test' },
    {
      port: 0,
      host: '127.0.0.1',
    },
  );
  const { port } = server.address() as AddressInfo;
  endpoint = new URL(`http://127.0.0.1:${port}/mcp`);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(buildDir, { recursive: true, force: true });
});

describe('loadCorpus', () => {
  it('takes pages from the twins, enriches them from pages.json, and skips dot-dirs', async () => {
    const { corpus, siteTitle } = await loadCorpus(buildDir);
    expect(siteTitle).toBe('Acme Docs');
    expect([...corpus.pages.keys()]).toEqual(['/guide/setup.md', '/index.md']);
    // Matched through a baseUrl ("/docs/") the build directory does not have.
    expect(corpus.pages.get('/guide/setup.md')).toMatchObject({
      title: 'Getting set up',
      description: 'Install and configure',
      url: 'https://acme.dev/docs/guide/setup',
    });
    // No pages.json entry: the title comes from the H1.
    expect(corpus.pages.get('/index.md')?.title).toBe('Acme Docs');
  });

  it('refuses a directory with no twins, naming the fix', async () => {
    const empty = await mkdtemp(path.join(os.tmpdir(), 'pokedocs-mcp-empty-'));
    await expect(loadCorpus(empty)).rejects.toThrow(DocsLoadError);
    await expect(loadCorpus(empty)).rejects.toThrow(/run the site build first/);
    await rm(empty, { recursive: true, force: true });
  });
});

describe('over streamable HTTP, with a real MCP client', () => {
  async function connect() {
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(endpoint));
    return client;
  }

  it('exposes exactly two read-only tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'query_docs_filesystem',
      'search_docs',
    ]);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.destructiveHint).toBe(false);
    }
    // The descriptions teach the composition: search, then read the path.
    const search = tools.find((t) => t.name === 'search_docs');
    expect(search?.description).toContain('query_docs_filesystem');
    await client.close();
  });

  it('searches, then reads the path search returned', async () => {
    const client = await connect();
    const found = await client.callTool({
      name: 'search_docs',
      arguments: { query: 'install baseUrl' },
    });
    const text = (found.content as { text: string }[])[0].text;
    expect(text).toContain('Getting set up');
    expect(text).toContain('path: /guide/setup.md');

    const read = await client.callTool({
      name: 'query_docs_filesystem',
      arguments: { command: 'cat /guide/setup.md' },
    });
    expect((read.content as { text: string }[])[0].text).toContain(
      'Install with npm',
    );
    await client.close();
  });

  it('returns command mistakes as tool errors, not protocol errors', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'query_docs_filesystem',
      arguments: { command: 'cat /guide/setup.md | head' },
    });
    expect(result.isError).toBe(true);
    await client.close();
  });

  it('blocks DNS rebinding: a foreign Host header is refused', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        host: 'attacker.example',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: '{}',
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it('answers anything but /mcp with a 404 that says where MCP lives', async () => {
    const response = await fetch(new URL('/', endpoint));
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('/mcp');
  });
});
