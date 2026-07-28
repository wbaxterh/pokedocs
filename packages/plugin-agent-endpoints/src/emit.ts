/**
 * Pure artifact builders for the agent surface (S1.5.1–S1.5.3). Everything
 * here is deterministic string-in/string-out so the contract is unit-testable
 * without a Docusaurus build.
 */

/** One included doc page, normalized from the docs plugin's metadata. */
export interface AgentDoc {
  title: string;
  description: string;
  /** Full pathname including baseUrl, e.g. "/pokedocs/architecture". */
  permalink: string;
  /** Raw markdown source of the page. */
  markdown: string;
}

export interface SiteInfo {
  /** e.g. "https://wbaxterh.github.io" */
  url: string;
  /** e.g. "/pokedocs/" */
  baseUrl: string;
  title: string;
  tagline?: string;
}

/**
 * Output path of a page's markdown twin, relative to the build dir.
 * `/pokedocs/architecture` → `architecture.md`; the root doc → `index.md`.
 */
export function twinRelativePath(permalink: string, baseUrl: string): string {
  const rel = permalink.startsWith(baseUrl)
    ? permalink.slice(baseUrl.length)
    : permalink.replace(/^\//, '');
  const clean = rel.replace(/\/$/, '');
  return clean === '' ? 'index.md' : `${clean}.md`;
}

/** Absolute pathname of a twin, e.g. "/pokedocs/architecture.md". */
export function twinHref(permalink: string, baseUrl: string): string {
  return `${baseUrl}${twinRelativePath(permalink, baseUrl)}`;
}

/** Strip a leading `---` frontmatter block. */
export function stripFrontmatter(markdown: string): string {
  const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? markdown.slice(match[0].length).replace(/^\s+/, '') : markdown;
}

/**
 * Twin content (S1.5.2): the source markdown without frontmatter, with the
 * page title guaranteed as an H1 so the twin reads like the HTML page even
 * when the title came from frontmatter.
 */
export function twinContent(doc: AgentDoc): string {
  const body = stripFrontmatter(doc.markdown);
  const hasH1 = /^#\s/.test(body);
  return `${hasH1 ? '' : `# ${doc.title}\n\n`}${body}`.trimEnd().concat('\n');
}

/**
 * /llms.txt (S1.5.1): the llmstxt.org index — H1 title, blockquote summary,
 * one link-with-description entry per page, each pointing at the .md twin.
 */
export function llmsTxt(site: SiteInfo, docs: AgentDoc[]): string {
  const lines = [`# ${site.title}`, ''];
  if (site.tagline) {
    lines.push(`> ${site.tagline}`, '');
  }
  lines.push('## Docs', '');
  for (const doc of docs) {
    const url = `${site.url}${twinHref(doc.permalink, site.baseUrl)}`;
    const description = doc.description ? `: ${doc.description}` : '';
    lines.push(`- [${doc.title}](${url})${description}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * /llms-full.txt (S1.5.1): the whole corpus in one fetch. Bodies are the
 * twin contents, so code fences and mermaid sources arrive verbatim.
 */
export function llmsFullTxt(site: SiteInfo, docs: AgentDoc[]): string {
  const header = [`# ${site.title}`, ''];
  if (site.tagline) {
    header.push(`> ${site.tagline}`, '');
  }
  const sections = docs.map((doc) =>
    [
      `# ${doc.title}`,
      '',
      `URL: ${site.url}${doc.permalink}`,
      '',
      stripFrontmatter(doc.markdown).trimEnd(),
    ].join('\n'),
  );
  return `${header.join('\n')}\n${sections.join('\n\n---\n\n')}\n`;
}

/**
 * Per-page discovery tag (S1.5.3), injected into a doc page's built HTML.
 * The site-wide llms.txt link is added globally via injectHtmlTags instead,
 * so every page (landing included) carries it exactly once.
 */
export function alternateLinkTags(permalink: string, baseUrl: string): string {
  return `<link rel="alternate" type="text/markdown" href="${twinHref(permalink, baseUrl)}" title="Markdown version of this page">`;
}

/** Insert tags right before </head>; returns null if no head is found. */
export function injectIntoHead(html: string, tags: string): string | null {
  const index = html.indexOf('</head>');
  if (index === -1) {
    return null;
  }
  return `${html.slice(0, index)}${tags}${html.slice(index)}`;
}
