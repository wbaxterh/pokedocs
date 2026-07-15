/**
 * @pokedocs/plugin-agent-endpoints — the static agent surface (PRD F1.5, F3.2).
 *
 * Every build emits /llms.txt (indexed page list), /llms-full.txt (full
 * corpus), a .md twin beside every HTML page with mermaid source intact,
 * and <link rel="alternate"> discovery tags. Pure static files: works
 * identically on GitHub Pages, Vercel, Netlify, or nginx.
 */

export interface AgentEndpointsOptions {
  /** Emit /llms.txt and /llms-full.txt (S1.5.1). Default true. */
  llmsTxt?: boolean;
  /** Emit a .md twin for every doc page (S1.5.2). Default true. */
  markdownTwins?: boolean;
  /** Add <link rel="alternate"> discovery tags to every page (S1.5.3). Default true. */
  discoveryLinks?: boolean;
  /**
   * Frontmatter field that excludes a page from every agent artifact
   * (twins, corpus, index). Default: "ingest" — pages with `ingest: false`
   * never reach the agent surface.
   */
  excludeField?: string;
}

/**
 * Docusaurus plugin entry point. Implementation lands in M1 (S1.5.1–S1.5.3);
 * the skeleton pins the public shape.
 */
export default function pluginAgentEndpoints(
  _context: unknown,
  _options: AgentEndpointsOptions = {},
): never {
  throw new Error(
    '@pokedocs/plugin-agent-endpoints is not implemented yet — tracked by S1.5.1 (github.com/wbaxterh/pokedocs/issues).',
  );
}
