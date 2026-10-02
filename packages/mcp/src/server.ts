/**
 * The MCP server factory (S3.3.2): exactly two read-only tools, search and
 * a filesystem query, the shape hosted docs platforms converged on. Agents
 * already know ls/cat/grep, so one query tool replaces a family of
 * get-page/list-pages tools. Runtime-agnostic, like corpus.ts.
 */

import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { DocsCorpus } from './corpus.js';

export interface DocsServerInfo {
  /** Site title, used in tool descriptions so agents can tell sites apart. */
  siteTitle: string;
  /** Version reported to clients. */
  version: string;
}

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function createDocsServer(
  corpus: DocsCorpus,
  info: DocsServerInfo,
): McpServer {
  const server = new McpServer({
    name: `${info.siteTitle} docs`,
    version: info.version,
  });

  server.registerTool(
    'search_docs',
    {
      title: `Search the ${info.siteTitle} docs`,
      description: `Search the ${info.siteTitle} documentation (${corpus.pages.size} pages). Returns ranked pages with a title, a path, and a snippet. To read a result in full, pass its path to query_docs_filesystem, e.g. "cat /architecture.md" or "head -n 60 /architecture.md". Use this first when you do not know which page covers a topic.`,
      inputSchema: z.object({
        query: z.string().min(1).describe('What to look for, in plain words.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(25)
          .optional()
          .describe('Maximum results (default 8).'),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, limit }) => {
      const hits = corpus.search(query, limit ?? 8);
      if (hits.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No pages match "${query}". Try fewer or different words, or grep: query_docs_filesystem "grep -i <word> /".`,
            },
          ],
        };
      }
      const text = hits
        .map(
          (hit, i) =>
            `${i + 1}. ${hit.title}\n   path: ${hit.path}${hit.url ? `\n   url: ${hit.url}` : ''}\n   ${hit.snippet}`,
        )
        .join('\n\n');
      return { content: [{ type: 'text', text }] };
    },
  );

  server.registerTool(
    'query_docs_filesystem',
    {
      title: `Read the ${info.siteTitle} docs`,
      description: `Run one read-only command against a virtual filesystem holding ONLY the ${info.siteTitle} documentation, one markdown file per page (e.g. /architecture.md). Nothing runs on any real machine. Supported: "ls [dir]", "cat <file>...", "head [-n N] <file>", "grep [-i] [-l] <pattern> [path]..." (pattern is a regex; grep searches recursively and prints path:line:text). No pipes or redirects: one command per call. Paths come from search_docs results or from ls /.`,
      inputSchema: z.object({
        command: z
          .string()
          .min(1)
          .describe('One command, e.g. "ls /" or "grep -i baseUrl /".'),
      }),
      annotations: READ_ONLY,
    },
    async ({ command }) => {
      const result = corpus.query(command);
      return {
        content: [{ type: 'text', text: result.text }],
        ...(result.isError ? { isError: true } : {}),
      };
    },
  );

  return server;
}
