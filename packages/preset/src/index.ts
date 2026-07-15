/**
 * @pokedocs/preset — the distribution core (PRD F1.2).
 *
 * One preset entry in docusaurus.config activates the PokeDocs theme,
 * build-time mermaid, local search, and agent endpoints. Installing a
 * capability and enabling it are never separate steps.
 */

import type { BrandingOptions } from '@pokedocs/theme';
import type { MermaidSsrOptions } from '@pokedocs/plugin-mermaid-ssr';
import type { AgentEndpointsOptions } from '@pokedocs/plugin-agent-endpoints';
import type { FrontmatterSchemaOptions } from '@pokedocs/plugin-frontmatter-schema';

export interface PokedocsPresetOptions {
  /** Brand configuration compiled into the full theme (F1.4). */
  branding?: BrandingOptions;
  /** Build-time mermaid rendering (F1.3). Set false to disable. */
  mermaid?: MermaidSsrOptions | false;
  /** Agent-readable artifacts: llms.txt, .md twins, discovery links (F1.5). Set false to disable. */
  agentEndpoints?: AgentEndpointsOptions | false;
  /** Frontmatter schema validation (F2.2). Set false to disable. */
  frontmatterSchema?: FrontmatterSchemaOptions | false;
  /** Local full-text search, on by default (F1.6). Set false to disable. */
  search?: boolean;
}

/**
 * Docusaurus preset entry point. Implementation lands in M1 (S1.2.1);
 * this skeleton pins the public shape so dependents can build today.
 */
export default function pokedocsPreset(
  _context: unknown,
  _options: PokedocsPresetOptions = {},
): never {
  throw new Error(
    '@pokedocs/preset is not implemented yet — tracked by S1.2.1 (github.com/wbaxterh/pokedocs/issues).',
  );
}
