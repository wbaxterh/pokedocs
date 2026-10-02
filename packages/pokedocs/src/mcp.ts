/**
 * `pokedocs mcp` (S3.3.2): serve a built site over MCP. The server lives
 * in @pokedocs/mcp, an optional peer dependency loaded only here, so the
 * CLI does not carry the MCP SDK for people who never run this command.
 *
 * In stdio mode stdout belongs to the protocol: everything human-facing
 * goes to stderr, or the client sees corrupt messages.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

export const MCP_USAGE = `Usage: pokedocs mcp [build-dir] [options]

Serve a built PokeDocs site to AI agents over MCP: a search_docs tool and a
read-only query_docs_filesystem tool (ls, cat, head, grep) over the site's
markdown twins. Optional; needs @pokedocs/mcp installed next to pokedocs.

  build-dir              The site's build output (default: build)

Options:
  --http                 Serve streamable HTTP at /mcp instead of stdio
  --port <n>             HTTP port (default: 3333)
  --host <addr>          HTTP bind address (default: 127.0.0.1)
  --allowed-host <name>  Extra Host header to accept, e.g. docs.acme.dev
                         (repeatable; needed when serving beyond loopback)
  -h, --help             Show this help

Claude Code:  claude mcp add my-docs -- npx pokedocs mcp ./build
`;

type McpModule = typeof import('@pokedocs/mcp');

async function loadMcpModule(): Promise<McpModule | null> {
  try {
    return await import('@pokedocs/mcp');
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (
      (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') &&
      String((error as Error).message).includes('@pokedocs/mcp')
    ) {
      return null;
    }
    throw error;
  }
}

async function cliVersion(): Promise<string> {
  const manifest = await readFile(
    path.join(__dirname, '..', 'package.json'),
    'utf8',
  );
  return (JSON.parse(manifest) as { version: string }).version;
}

export async function runMcpCommand(rest: string[]): Promise<number> {
  let values: {
    http?: boolean;
    port?: string;
    host?: string;
    'allowed-host'?: string[];
    help?: boolean;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        http: { type: 'boolean', default: false },
        port: { type: 'string', default: '3333' },
        host: { type: 'string', default: '127.0.0.1' },
        'allowed-host': { type: 'string', multiple: true },
        help: { type: 'boolean', short: 'h', default: false },
      },
    }));
  } catch (error) {
    console.error(`pokedocs: ${(error as Error).message}\n\n${MCP_USAGE}`);
    return 1;
  }
  if (values.help) {
    console.error(MCP_USAGE);
    return 0;
  }
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`pokedocs: --port must be 0-65535, got ${values.port}`);
    return 1;
  }

  const mcp = await loadMcpModule();
  if (!mcp) {
    console.error(
      'pokedocs mcp needs the optional @pokedocs/mcp package:\n  npm install --save-dev @pokedocs/mcp',
    );
    return 1;
  }

  const buildDir = path.resolve(positionals[0] ?? 'build');
  let loaded: Awaited<ReturnType<McpModule['loadCorpus']>>;
  try {
    loaded = await mcp.loadCorpus(buildDir);
  } catch (error) {
    if (error instanceof mcp.DocsLoadError) {
      console.error(`pokedocs: ${error.message}`);
      return 1;
    }
    throw error;
  }
  const info = { siteTitle: loaded.siteTitle, version: await cliVersion() };
  const pages = loaded.corpus.pages.size;

  if (!values.http) {
    await mcp.serveDocsStdio(loaded.corpus, info);
    console.error(
      `pokedocs mcp: serving ${pages} pages of ${info.siteTitle} over stdio`,
    );
    // The process stays up until the client closes stdin.
    return new Promise<number>(() => {});
  }

  const host = values.host ?? '127.0.0.1';
  const server = await mcp.serveDocsHttp(loaded.corpus, info, {
    port,
    host,
    allowedHosts: values['allowed-host'],
  });
  const address = server.address();
  const boundPort =
    typeof address === 'object' && address ? address.port : port;
  console.error(
    `pokedocs mcp: serving ${pages} pages of ${info.siteTitle} at http://${host}:${boundPort}/mcp`,
  );
  if (
    !['127.0.0.1', 'localhost', '::1'].includes(host) &&
    !values['allowed-host']?.length
  ) {
    console.error(
      'pokedocs mcp: warning: bound beyond loopback with no --allowed-host, so the Host header is not checked',
    );
  }
  return new Promise<number>(() => {});
}
