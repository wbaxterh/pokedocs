---
'create-pokedocs': patch
'@pokedocs/theme': patch
---

Fix two ways a fresh scaffold was broken before its first build.

**Free text in `--site-name` or `--tagline` produced a site that would not
compile.** Both values were interpolated raw into single-quoted TypeScript
strings, so an apostrophe, the most ordinary character in a tagline, emitted
invalid syntax. The same value also lands in a YAML frontmatter scalar (a
colon ended the value early), inside a template literal (a backtick or
`${` injected), and in an XML attribute on the generated logo (a quote closed
the attribute). Each context now gets a value escaped for that syntax, and
the generated config binds the name and tagline to consts so they are escaped
once and reused.

**Compiled branding silently lost the cascade and rendered stock Infima
blue.** The preset injects the brand ladder as an unlayered inline `<style>`
in `<head>`, which lands before the stylesheet link. Under Docusaurus v4 the
bundle is wrapped in `@layer` and unlayered CSS wins regardless of order, so
`:root` was enough; without v4 nothing is layered, document order decides,
and the later bundle took `:root`. The emitted selectors are now `html:root`
and `html[data-theme='dark']`, lifting specificity from (0,1,0) to (0,1,1) so
branding wins whether or not a site opts into v4. Existing sites are fixed by
upgrading, with no config change. New scaffolds also emit
`future: { v4: true }`.
