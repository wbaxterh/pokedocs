---
"@pokedocs/mcp": minor
"pokedocs": minor
---

`pokedocs mcp`: serve a built site to AI agents over MCP (S3.3.2).

New optional package `@pokedocs/mcp`, built on the MCP TypeScript SDK v2. It loads any PokeDocs
build output and exposes exactly two read-only tools: `search_docs` (BM25 ranking over title,
description, headings, and body, with path, URL, and snippet) and `query_docs_filesystem`
(`ls`, `cat`, `head -n`, `grep -i -l` over an in-memory tree of the `.md` twins, so no command
can reach a real file). Serves stdio, or streamable HTTP at `/mcp` with Host and Origin checks
on loopback against DNS rebinding.

`pokedocs mcp [build-dir] [--http --port --host --allowed-host]` loads the package on demand
and prints the install command when it is missing, so the CLI does not carry the SDK.
