---
"@pokedocs/plugin-agent-endpoints": minor
"@pokedocs/preset": minor
"pokedocs": minor
---

Well-known discovery files on every build (S3.2.1).

- `/.well-known/agent-skills/index.json` per the agent-skills discovery RFC v0.2.0, with a
  `sha256:` digest of the listed skill, and the skill itself at
  `/.well-known/agent-skills/<name>/SKILL.md`: when to use it, the fetch order for this site,
  and its page list. A hand-written `SKILL.md` at that path in `static/` replaces the
  generated one, and the index takes its description from it.
- `/.well-known/pokedocs.json`: a versioned manifest with the absolute URL of every agent
  artifact.
- `pages.json` entries gain a `path` (the route).
- New option `agentEndpoints.agentSkill: { name?, description? } | false`, validated by the
  preset against the agent-skills naming rules.

`pokedocs deploy init github-pages` now writes `actions/upload-pages-artifact@v5` with
`include-hidden-files: true`. From v4 the action drops dot-directories by default, which
would silently strip `.well-known/` from the deploy.
