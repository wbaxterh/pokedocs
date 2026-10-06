/**
 * Node entry points for `pokedocs mcp` (S3.3.2): load a built site into a
 * DocsCorpus, then serve it over stdio or streamable HTTP. Everything
 * protocol-shaped lives in the SDK and server.ts; this file only does I/O.
 */

import { readdir, readFile } from 'node:fs/promises';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import {
  createMcpHandler,
  hostHeaderValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  originValidationResponse,
} from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { type CorpusPage, DocsCorpus } from './corpus.js';
import { createDocsServer, type DocsServerInfo } from './server.js';

export class DocsLoadError extends Error {}

async function walkMarkdown(root: string, dir = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    // Dot-directories hold discovery files (.well-known/…/SKILL.md), not pages.
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdown(root, rel)));
    } else if (entry.name.endsWith('.md')) {
      files.push(rel);
    }
  }
  return files;
}

async function readJson<T>(file: string): Promise<T | null> {
  return readFile(file, 'utf8')
    .then((text) => JSON.parse(text) as T)
    .catch(() => null);
}

interface PagesJson {
  site?: { title?: string };
  pages?: {
    title: string;
    description?: string;
    url?: string;
    markdownUrl?: string;
  }[];
}

/** "https://x.dev/docs/guide/setup.md" → "guide/setup.md" when that file exists. */
function matchTwin(markdownUrl: string, files: Set<string>): string | null {
  let segments: string[];
  try {
    segments = new URL(markdownUrl).pathname.split('/').filter(Boolean);
  } catch {
    return null;
  }
  // Strip baseUrl segments from the front until the path names a real file.
  for (let i = 0; i < segments.length; i++) {
    const candidate = segments.slice(i).join('/');
    if (files.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function titleFrom(markdown: string, file: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading
    ? heading[1].trim()
    : path.basename(file, '.md').replace(/[-_]+/g, ' ');
}

/**
 * Any PokeDocs build works: the .md twins are the pages, and pages.json
 * (S2.2.2) adds titles, descriptions, and canonical URLs when present.
 */
export async function loadCorpus(
  buildDir: string,
): Promise<{ corpus: DocsCorpus; siteTitle: string }> {
  const root = path.resolve(buildDir);
  const files = await walkMarkdown(root).catch(() => {
    throw new DocsLoadError(`cannot read ${root}: is the path right?`);
  });
  if (files.length === 0) {
    throw new DocsLoadError(
      `no markdown twins in ${root}. Point pokedocs mcp at a PokeDocs build output (run the site build first).`,
    );
  }
  const fileSet = new Set(files);
  const pagesJson = await readJson<PagesJson>(path.join(root, 'pages.json'));
  const manifest = await readJson<{ site?: { title?: string } }>(
    path.join(root, '.well-known', 'pokedocs.json'),
  );

  const meta = new Map<
    string,
    { title: string; description: string; url?: string }
  >();
  for (const page of pagesJson?.pages ?? []) {
    const twin = page.markdownUrl && matchTwin(page.markdownUrl, fileSet);
    if (twin) {
      meta.set(twin, {
        title: page.title,
        description: page.description ?? '',
        url: page.url,
      });
    }
  }

  const pages: CorpusPage[] = await Promise.all(
    files.map(async (file) => {
      const markdown = await readFile(path.join(root, file), 'utf8');
      const known = meta.get(file);
      return {
        path: `/${file}`,
        title: known?.title ?? titleFrom(markdown, file),
        description: known?.description ?? '',
        ...(known?.url ? { url: known.url } : {}),
        markdown,
      };
    }),
  );
  const siteTitle =
    manifest?.site?.title ?? pagesJson?.site?.title ?? path.basename(root);
  return { corpus: new DocsCorpus(pages), siteTitle };
}

export async function serveDocsStdio(
  corpus: DocsCorpus,
  info: DocsServerInfo,
): Promise<void> {
  serveStdio(() => createDocsServer(corpus, info));
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1']);

export interface HttpOptions {
  port: number;
  host: string;
  /** Extra Host header values to accept when serving beyond loopback. */
  allowedHosts?: string[];
}

/**
 * Streamable HTTP at /mcp. On a loopback bind the Host and Origin checks
 * are what stop DNS rebinding (a web page resolving its own name to
 * 127.0.0.1 and talking to this server), so they are always on there.
 */
export async function serveDocsHttp(
  corpus: DocsCorpus,
  info: DocsServerInfo,
  options: HttpOptions,
): Promise<Server> {
  const handler = createMcpHandler(() => createDocsServer(corpus, info));
  const loopback = LOOPBACK.has(options.host);
  const allowedHosts = [
    ...(loopback ? localhostAllowedHostnames() : []),
    ...(options.allowedHosts ?? []),
  ];

  const server = createServer((req, res) => {
    void handle(req, res).catch((error: Error) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'text/plain' });
      }
      res.end(`internal error: ${error.message}`);
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const request = toRequest(req);
    if (new URL(request.url).pathname !== '/mcp') {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('pokedocs mcp serves MCP at /mcp\n');
      return;
    }
    if (allowedHosts.length > 0) {
      const rejected =
        hostHeaderValidationResponse(request, allowedHosts) ??
        (loopback
          ? originValidationResponse(request, localhostAllowedOrigins())
          : undefined);
      if (rejected) {
        await send(rejected, res);
        return;
      }
    }
    await send(await handler.fetch(request), res);
  }

  server.on('close', () => {
    void handler.close();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => resolve());
  });
  return server;
}

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    ...(hasBody
      ? {
          body: Readable.toWeb(req) as unknown as ReadableStream,
          duplex: 'half',
        }
      : {}),
  } as RequestInit);
}

async function send(response: Response, res: ServerResponse): Promise<void> {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) {
    res.end();
    return;
  }
  const body = Readable.fromWeb(response.body as unknown as NodeReadableStream);
  res.on('close', () => body.destroy());
  body.pipe(res);
}
