<p align="center">
  <img src="brand/logo-badge.svg" width="96" alt="PokeDocs">
</p>

<h1 align="center">PokeDocs</h1>

```bash
npx create-pokedocs my-docs
```

Docusaurus, with the parts you always end up building yourself already built. One preset entry turns everything on; the scaffold has no boilerplate to delete.

**Docs: https://wbaxterh.github.io/pokedocs/** — built with PokeDocs, from this repo, on every merge.

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
