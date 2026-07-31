<p align="center">
  <img src="brand/logo-badge.svg" width="96" alt="PokeDocs">
</p>

<h1 align="center">PokeDocs</h1>

```bash
npx create-pokedocs my-docs
```

Docusaurus, with the parts you always end up building yourself already built. One preset entry turns everything on; the scaffold has no boilerplate to delete.

**Docs: https://wbaxterh.github.io/pokedocs/** — built with PokeDocs, from this repo, on every merge.

## Already on Docusaurus?

PokeDocs is a preset, not a fork — migrating is a config swap, not a rewrite. Both of our production migrations (a 3.8 site and a 3.9 site, different hosts) touched about six files each and changed zero URLs:

1. `npm i @pokedocs/preset @docusaurus/core@3.10.2` — and drop `@docusaurus/preset-classic`, `@docusaurus/theme-mermaid`, and any bolted-on search plugin; the preset covers all three.
2. In `docusaurus.config`, replace the `'classic'` preset entry with `'@pokedocs/preset'`, keeping your existing `docs` and `theme` options, and add `branding: { brandColor: '#yourhex' }`.
3. Delete the `--ifm-color-primary*` ladders from `custom.css`. Keep everything else.

Swizzles, `themeConfig`, and your URLs all survive. The next build emits `llms.txt`, a markdown twin per page, and working search.

Or hand it to a coding agent — paste this at your site's repo root:

```text
Migrate this Docusaurus site to PokeDocs (@pokedocs/preset — an agent-native
Docusaurus distribution; docs at https://wbaxterh.github.io/pokedocs/).

1. Deps: add @pokedocs/preset@^0.2.0; set @docusaurus/core and the
   @docusaurus/{module-type-aliases,tsconfig,types} devDeps to 3.10.2; remove
   @docusaurus/preset-classic, @docusaurus/theme-mermaid, and any local search
   plugin (the preset provides search). If the config has future: { v4: true },
   also add @docusaurus/faster@3.10.2.
2. Config: replace the 'classic' preset tuple with ['@pokedocs/preset', {...}],
   moving the existing docs options (sidebarPath, editUrl — and KEEP the current
   routeBasePath and trailingSlash so no URL changes) and theme.customCss into
   it. Delete markdown.mermaid, themes: ['@docusaurus/theme-mermaid'], and
   themeConfig.mermaid. Add branding: { brandColor } from the site's current
   --ifm-color-primary; if light and dark modes use different primaries, use
   brandColor: { light, dark }.
3. custom.css: delete the --ifm-color-primary* ladder blocks — the preset
   compiles both modes, deriving dark LIGHTER and contrast-checked. Keep all
   other styling. If the site uses dark mode, add:
   .pokedocs-mermaid svg { max-width: 100%; height: auto; }
   [data-theme="dark"] .pokedocs-mermaid { background: #fffdf8;
     border-radius: 8px; padding: .75rem; }
4. Gotchas: {#custom-id} heading anchors fail to parse under future.v4 — remove
   them and point inbound links at the auto-generated slugs. Mermaid renders at
   build time via chromium: run `npx playwright install chromium` once locally,
   and add that command before the build step in CI/deploy (GitHub Actions,
   Amplify, Vercel, Netlify).
5. Verify before finishing: the production build passes; build/llms.txt exists;
   pages have .md twins in the build output; diagram pages contain
   data-mermaid-source; no URL changed.
```

## The parts Docusaurus doesn't ship

**Mermaid rendered at build time.** Diagrams arrive as inline SVG in the static HTML — visible with JavaScript disabled, no client-side render flash. The mermaid source stays in the page, so AI agents read your architecture diagram instead of skipping an opaque `<svg>`. A syntax error fails the build with file and line, which means no broken diagram ever reaches production.

**A complete theme from one hex code.**

```ts
branding: { brandColor: '#D8232A', logo: 'img/logo.svg' }
```

That compiles both Infima shade ladders, the favicon, and the font wiring. Dark mode is derived *lighter* than your brand color — the direction everyone gets wrong by hand — and contrast-checked to WCAG AA. Delete your `custom.css`.

**Your site is readable by agents, not just people.** Every build emits `llms.txt`, `llms-full.txt`, and a markdown twin beside every page, with `<link rel="alternate">` discovery on every page. Don't take our word for it:

```bash
curl https://wbaxterh.github.io/pokedocs/llms.txt
curl https://wbaxterh.github.io/pokedocs/architecture.md
```

**Search that works on day one.** Local full-text index built at build time — no Algolia application, no external service, identical behavior in dev and prod, works offline.

**Deploys are generated, not researched.** `pokedocs deploy init github-pages` writes the Pages workflow this repo deploys with; `pokedocs deploy init docker` writes a multi-stage Dockerfile behind non-root nginx, `try_files` derived from your `baseUrl`. And the classic shipped-with-`url: localhost` bug is closed: a production build carrying a placeholder URL warns loudly, and `POKEDOCS_STRICT_URL=true` fails it.

**A linter for what a green build won't catch.** `npx pokedocs check` finds the admonition titles rendering as body text, unclosed fences, MDX compile hazards, orphaned pages, and dangling sidebar entries — in seconds, no build. On its first run against two production sites that had been building green for months, it found **37 live defects**. `--format github` puts findings inline on PRs.

**Config errors written for humans.**

```
unknown option `brandign` — did you mean `branding`?
```

Every option is validated at build start, with the expected shape and a copy-pasteable example in the error.

**A scaffold agents can work in.** `create-pokedocs` generates `AGENTS.md`/`CLAUDE.md` encoding the site's authoring conventions — frontmatter, sidebar rules, mermaid guidance — so agent-written docs are right the first time.

## Not a fork

PokeDocs is a distribution: `@pokedocs/preset` wraps the standard classic preset and tracks upstream minors. Docusaurus's own escape hatches — swizzling, plugins, themeConfig — all still work, and upstream improvements arrive on schedule. [Architecture](https://wbaxterh.github.io/pokedocs/architecture/) has the details.

## Development

pnpm-workspace monorepo. `pnpm install && pnpm build` builds every package; `pnpm test` and the [contributing guide](https://wbaxterh.github.io/pokedocs/contributing/) cover the rest. The docs site in `docs-site/` is the dogfood — its config is one preset entry, and CI builds a freshly scaffolded site on every commit.

```
brand/                              logo SVGs (lens mark + badge)
docs/prd/                           PRD source (markdown) + PDF pipeline
packages/
  create-pokedocs/                  scaffolder — docs-only site in one command
  pokedocs/                         CLI — deploy init today; check, export, mcp with their milestones
  preset/                           @pokedocs/preset — everything wired by default
  theme/                            @pokedocs/theme — branding compiler, reader components
  plugin-mermaid-ssr/               build-time mermaid → inline SVG, source preserved
  plugin-agent-endpoints/           llms.txt, .md twins, discovery links — all static
  plugin-frontmatter-schema/        declarative frontmatter validation
  actions/                          GitHub Actions workflow templates
```

## License

[MIT](LICENSE)
