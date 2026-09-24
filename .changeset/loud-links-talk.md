---
"pokedocs": minor
"@pokedocs/plugin-agent-endpoints": minor
---

HTTP discovery for generated host configs (S3.2.4).

- Every `deploy init` target that can set response headers now sends a `Link` header
  advertising `llms.txt`, `llms-full.txt`, the agent-skills index, and `pokedocs.json`.
  New targets: `netlify` and `cloudflare-pages` (both write `static/_headers`) and `vercel`
  (writes `vercel.json`). The link targets come from the plugin's `AGENT_ARTIFACTS` list,
  the same one `pokedocs.json` is built from, and the agent-skills link is left out when the
  config sets `agentSkill: false`.
- The `docker` target's nginx conf negotiates: `Accept: text/markdown` on a page URL returns
  its `.md` twin with `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`. The
  twin is served only when it exists, so browsers, assets, and `llms.txt` are unaffected.
  Direct `.md` requests get the same content type.
- Fix: the docker target's slash redirect (`/page` to `/page/`) no longer names the
  container's internal port in `Location`, which broke navigation behind any port mapping
  or proxy (`absolute_redirect off`).

Netlify, Cloudflare Pages, and Vercel cannot negotiate from static config; that is S3.2.5.
