---
sidebar_position: 7
description: pokedocs check — the docs linter for what a green build won't catch. Broken admonition titles, unclosed fences, MDX3 hazards, mermaid pitfalls, orphaned pages — in seconds, with CI and pre-commit modes.
---

# Checks

A green Docusaurus build does not mean your docs are right. `:::warning
Title` builds green and renders the title as body text. A page dropped
from the sidebar builds green and silently falls out of navigation.
`pokedocs check` catches that class — in seconds, without a build:

```bash
npx pokedocs check          # from your site directory
```

On its first run against two production sites (both building green for
months), it found 37 live defects.

## What it catches

| Rule | Severity | The problem |
|---|---|---|
| `admonition-space-title` | error | `:::warning Title` renders the title as body text — the fix is `:::warning[Title]` |
| `unclosed-admonition` | error | the rest of the page renders inside the box |
| `unclosed-fence` | error | everything after renders as code |
| `mdx-lt-digit` | error | `<10ms` in prose is parsed as JSX and fails the MDX compile |
| `heading-custom-id-v4` | error | `{#custom-id}` anchors break under `future.v4` with a cryptic acorn error |
| `mermaid-unquoted-parens` | warning | unquoted `(parens)` in labels fail the diagram parse |
| `dangling-sidebar-entry` | error | sidebar references a doc id that doesn't exist |
| `orphaned-page` | warning | page unreachable from any sidebar (respects `draft`/`unlisted`) |

Every finding names the file, line, and the concrete fix — readable by
you, and by the coding agent you paste it into.

## CI

```yaml
- run: npx pokedocs check --format github
```

`--format github` emits workflow annotations that appear inline on PRs;
`--format json` is the machine-readable contract. Exit code is non-zero
when findings reach `--fail-on` (default `error`; `warning` to be
strict, `never` to only report).

## Pre-commit

With [husky](https://typicode.github.io/husky/) (or any hook runner):

```bash
# .husky/pre-commit
npx pokedocs check --fail-on error
```

The check runs in seconds — no production build — so it belongs where
the work happens.
