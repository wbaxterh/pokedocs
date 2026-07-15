/**
 * @pokedocs/plugin-mermaid-ssr — build-time mermaid rendering (PRD F1.3).
 *
 * Every mermaid code fence compiles to inline SVG during the build: humans
 * and crawlers get the diagram without JavaScript, agents get the preserved
 * source, and a syntax error fails the build with file and line.
 */

export interface MermaidSsrOptions {
  /**
   * Keep the raw mermaid source in the DOM alongside the rendered SVG
   * (S1.3.2). Defaults to true — this is the agent-readability contract.
   */
  preserveSource?: boolean;
  /** Mermaid theme overrides applied per color mode. */
  themeVariables?: Record<string, string>;
}

/** Engine choice is an open spike (S1.3.4): rehype-mermaid vs mermaid-cli at build. */
export type MermaidSsrEngine = 'rehype-mermaid' | 'mermaid-cli';

/**
 * Docusaurus plugin entry point. Implementation lands in M1 (S1.3.1–S1.3.4);
 * the skeleton pins the public shape.
 */
export default function pluginMermaidSsr(
  _context: unknown,
  _options: MermaidSsrOptions = {},
): never {
  throw new Error(
    '@pokedocs/plugin-mermaid-ssr is not implemented yet — tracked by S1.3.1 (github.com/wbaxterh/pokedocs/issues).',
  );
}
