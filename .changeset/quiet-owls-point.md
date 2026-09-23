---
"@pokedocs/plugin-agent-endpoints": minor
"@pokedocs/preset": minor
---

Every `.md` twin now opens with a pointer to the site's `llms.txt` (S3.2.3).

Agents usually land on one twin from a search result or a pasted link and never see the
HTML `<link rel>` tags, so the twin itself now names the index:

```md
> **Documentation index:** https://your.site/llms.txt
> Use this file to discover all available pages before exploring further.
```

On by default. `agentEndpoints.indexPointer: false` removes it; a string replaces the second
line. It never appears in `llms-full.txt`, and it is skipped with a build warning while the
site `url` is a placeholder. The placeholder-URL check now lives in the plugin
(`isPlaceholderUrl`) and the preset's URL guard reuses it.
