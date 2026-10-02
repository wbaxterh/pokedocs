---
sidebar_position: 5.5
description: Serve a built PokeDocs site to AI agents over MCP with two read-only tools, search_docs and query_docs_filesystem, over stdio or streamable HTTP. Optional, and nothing to host.
---

# MCP server

`llms.txt` and the markdown twins let an agent read your docs over plain
HTTP. `pokedocs mcp` goes one step further: it serves a built site to any
MCP client (Claude Code, Cursor, and others) as two tools.

| Tool | What it does |
|---|---|
| `search_docs` | Ranked search over every page: title, path, URL, and a snippet. |
| `query_docs_filesystem` | One read-only command over a virtual tree of the `.md` twins: `ls`, `cat`, `head -n`, `grep -i -l`. |

The pairing is deliberate. Agents already know how to `ls`, `cat`, and
`grep`, so one filesystem tool replaces a family of get-page and list-pages
tools, and the descriptions tell the agent to search first and then read
the path it got back. Both tools are marked `readOnlyHint`. The tree holds
nothing but the twins, kept in memory, so no command can reach a real file.

## Run it

It is optional and ships separately, so the CLI stays light:

```bash
npm install --save-dev @pokedocs/mcp
npm run build
npx pokedocs mcp ./build
```

Add it to Claude Code as a stdio server:

```bash
claude mcp add my-docs -- npx pokedocs mcp ./build
```

Or serve streamable HTTP at `/mcp`:

```bash
npx pokedocs mcp ./build --http --port 3333
```

On `127.0.0.1` (the default) the server checks the `Host` and `Origin`
headers, which is what stops DNS rebinding: a web page resolving its own
domain to your machine cannot talk to it. To serve beyond loopback, name
the hostnames clients will use with `--allowed-host docs.acme.dev`.

## What it reads

Any PokeDocs build output. The `.md` twins are the pages; `pages.json`
adds titles, descriptions, and canonical URLs when present, and the site
title comes from [`pokedocs.json`](./agent-endpoints.md#well-known-files).
Dot-directories such as `.well-known/` are left out. Rebuild the site and
restart the server to pick up changes.
