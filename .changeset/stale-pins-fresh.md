---
"create-pokedocs": patch
---

New sites pin the current preset instead of `^0.1.0`.

The template hardcoded `"@pokedocs/preset": "^0.1.0"`, and a caret on a `0.x` version never
crosses a minor, so every scaffolded site installed preset 0.1.0 and missed everything since:
search, frontmatter schemas, `llms.txt` pointers, well-known discovery. The pin is now
`^<this package's version>`, and `create-pokedocs` is released in a changesets fixed group with
`@pokedocs/preset`, so the two always ship together at the same version and the pin is the
preset the template was tested with.
