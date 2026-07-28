---
sidebar_position: 6
description: Host anywhere — GitHub Pages via pokedocs deploy init, zero-config Vercel/Netlify, self-hosted Docker/nginx, and the baseUrl footgun that can no longer happen.
---

# Hosting

A PokeDocs build is a directory of static files — HTML, the search index,
`llms.txt`, markdown twins. Anything that serves files serves all of it.
`pokedocs deploy init` generates the deploy setup for the targets that
need one; platforms that auto-detect Docusaurus need nothing.

## GitHub Pages

```bash
npx pokedocs deploy init github-pages
```

Generates the workflow this very site deploys with on every merge —
build, chromium cached for diagram rendering, `upload-pages-artifact`,
`deploy-pages` — plus `static/.nojekyll`. One-time setup: repo Settings →
Pages → Source: "GitHub Actions". A custom domain? Add
`--domain docs.example.dev` and the CNAME file is handled.

## Vercel and Netlify

Both auto-detect Docusaurus: import the repo and the build command and
output directory (`build/`) are filled in. One adjustment if your docs
use mermaid diagrams — the build needs chromium, so set the build
command to:

```bash
npx playwright install chromium && npm run build
```

## Self-hosting with Docker

```bash
npx pokedocs deploy init docker
docker build -t my-docs .
docker run --rm -p 8080:8080 my-docs
```

A maintained multi-stage build: node + chromium render the site, then the
static output is served by **unprivileged nginx** — non-root, port 8080,
gzip on, `try_files` and the 404 page derived from your configured
`baseUrl` (override with `--base-url`). Set the public URL at image build
time: `docker build --build-arg POKEDOCS_URL=https://docs.mycompany.dev .`

## The baseUrl footgun, eliminated

The classic shipped-docs bug: a production build carrying
`url: http://localhost:3000` — canonical URLs, the sitemap, and
`llms.txt` all pointing nowhere. PokeDocs closes it:

- A production build with a localhost-like or `example.com` url prints a
  prominent warning naming the fix.
- `POKEDOCS_STRICT_URL=true` turns the warning into a build failure —
  recommended in CI.
- Scaffolded sites read `POKEDOCS_URL` / `POKEDOCS_BASE_URL` from the
  environment, so per-environment URLs need no config edits.
