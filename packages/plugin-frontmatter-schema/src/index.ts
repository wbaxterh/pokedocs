/**
 * @pokedocs/plugin-frontmatter-schema — frontmatter contracts (PRD F2.2).
 *
 * Sites declare frontmatter schemas in config (per-directory or per-doc-type:
 * required fields, enums, date formats) and violations fail the build with
 * file, field, and expected type. Validated metadata flows into the agent
 * surface so retrieval pipelines can rely on it.
 */

import path from 'node:path';
import type { LoadContext, Plugin } from '@docusaurus/types';
import { matchesInclude, validateDocFrontmatter } from './validate.js';

/** A single field constraint within a frontmatter schema. */
export interface FrontmatterFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required?: boolean;
  /** Allowed values when type is "enum". */
  values?: readonly string[];
  /**
   * Emit this field into the agent surface — llms.txt entries and
   * pages.json (S2.2.2). The preset wires it through automatically.
   */
  index?: boolean;
}

export interface FrontmatterSchema {
  /** Glob the schema applies to, relative to the docs root (e.g. "adr/**"). */
  include: string;
  fields: Record<string, FrontmatterFieldSchema>;
}

export interface FrontmatterSchemaOptions {
  schemas?: FrontmatterSchema[];
}

interface DocsPluginDoc {
  source: string;
  frontMatter: Record<string, unknown>;
}

interface DocsPluginContent {
  loadedVersions: { contentPath?: string; docs: DocsPluginDoc[] }[];
}

const DOCS_PLUGIN_NAME = 'docusaurus-plugin-content-docs';

export default function pluginFrontmatterSchema(
  context: LoadContext,
  options: FrontmatterSchemaOptions = {},
): Plugin {
  const schemas = options.schemas ?? [];

  return {
    name: '@pokedocs/plugin-frontmatter-schema',

    allContentLoaded({ allContent }) {
      if (schemas.length === 0) {
        return; // Zero-config default is permissive.
      }
      const instances = Object.values(
        (allContent as Record<string, Record<string, unknown>>)[
          DOCS_PLUGIN_NAME
        ] ?? {},
      );
      const problems: string[] = [];

      for (const content of instances) {
        for (const version of (content as DocsPluginContent | undefined)
          ?.loadedVersions ?? []) {
          for (const doc of version.docs) {
            const absolute = doc.source.startsWith('@site/')
              ? path.join(context.siteDir, doc.source.slice('@site/'.length))
              : doc.source;
            const rel = version.contentPath
              ? path
                  .relative(version.contentPath, absolute)
                  .split(path.sep)
                  .join('/')
              : doc.source.replace(/^@site\/[^/]+\//, '');

            for (const schema of schemas) {
              if (!matchesInclude(rel, schema.include)) {
                continue;
              }
              for (const violation of validateDocFrontmatter(
                doc.frontMatter,
                schema,
              )) {
                problems.push(
                  `  ${rel} → ${violation.field}: expected ${violation.expected}, got ${violation.actual}`,
                );
              }
            }
          }
        }
      }

      if (problems.length > 0) {
        throw new Error(
          `[@pokedocs/plugin-frontmatter-schema] ${problems.length} frontmatter violation${problems.length === 1 ? '' : 's'}:\n\n${problems.join('\n')}\n\nSchemas are defined in docusaurus.config (preset option frontmatterSchema).`,
        );
      }
    },
  };
}

export {
  type FieldViolation,
  indexedFields,
  matchesInclude,
  validateDocFrontmatter,
} from './validate.js';
