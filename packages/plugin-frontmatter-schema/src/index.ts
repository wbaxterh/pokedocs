/**
 * @pokedocs/plugin-frontmatter-schema — frontmatter contracts (PRD F2.2).
 *
 * Sites declare frontmatter schemas in config (per-directory or per-doc-type:
 * required fields, enums, date formats) and violations fail the build with
 * file, field, and expected type. Validated metadata flows into the agent
 * surface so retrieval pipelines can rely on it.
 */

/** A single field constraint within a frontmatter schema. */
export interface FrontmatterFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required?: boolean;
  /** Allowed values when type is "enum". */
  values?: readonly string[];
}

export interface FrontmatterSchema {
  /** Glob the schema applies to, relative to the docs root (e.g. "adr/**"). */
  include: string;
  fields: Record<string, FrontmatterFieldSchema>;
}

export interface FrontmatterSchemaOptions {
  schemas?: FrontmatterSchema[];
}

/**
 * Docusaurus plugin entry point. Implementation lands in M2 (S2.2.1/S2.2.2);
 * the skeleton pins the public shape.
 */
export default function pluginFrontmatterSchema(
  _context: unknown,
  _options: FrontmatterSchemaOptions = {},
): never {
  throw new Error(
    '@pokedocs/plugin-frontmatter-schema is not implemented yet — tracked by S2.2.1 (github.com/wbaxterh/pokedocs/issues).',
  );
}
