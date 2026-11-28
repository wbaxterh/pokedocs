# @pokedocs/mcp

## 0.1.0

### Minor Changes

- [#93](https://github.com/wbaxterh/pokedocs/pull/93) [`1e3ce35`](https://github.com/wbaxterh/pokedocs/commit/1e3ce359f9d18c9d43cf6acb93e240ba8c76c7c8) Thanks [@wbaxterh](https://github.com/wbaxterh)! - `pokedocs mcp`: serve a built site to AI agents over MCP (S3.3.2).

  New optional package `@pokedocs/mcp`, built on the MCP TypeScript SDK v2. It loads any PokeDocs
  build output and exposes exactly two read-only tools: `search_docs` (BM25 ranking over title,
  description, headings, and body, with path, URL, and snippet) and `query_docs_filesystem`
  (`ls`, `cat`, `head -n`, `grep -i -l` over an in-memory tree of the `.md` twins, so no command
  can reach a real file). Serves stdio, or streamable HTTP at `/mcp` with Host and Origin checks
  on loopback against DNS rebinding.

  `pokedocs mcp [build-dir] [--http --port --host --allowed-host]` loads the package on demand
  and prints the install command when it is missing, so the CLI does not carry the SDK.
