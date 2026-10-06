/**
 * @pokedocs/mcp — an optional MCP server over a built PokeDocs site
 * (PRD S3.3.2). Two read-only tools, search_docs and query_docs_filesystem,
 * over the site's .md twins; stdio or streamable HTTP. Installed separately
 * so the pokedocs CLI stays light: `pokedocs mcp` loads it on demand.
 */

export {
  type CorpusPage,
  DocsCorpus,
  MAX_GREP_LINES,
  MAX_OUTPUT_CHARS,
  type SearchHit,
  splitCommand,
} from './corpus.js';
export {
  DocsLoadError,
  type HttpOptions,
  loadCorpus,
  serveDocsHttp,
  serveDocsStdio,
} from './node.js';
export { createDocsServer, type DocsServerInfo } from './server.js';
