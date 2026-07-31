/**
 * Pure frontmatter validation (S2.2.1): schemas in, violations out —
 * with the file, field, and expected shape a human needs to fix it.
 */

import type { FrontmatterFieldSchema, FrontmatterSchema } from './index.js';

export interface FieldViolation {
  field: string;
  expected: string;
  actual: string;
}

/** Convert a docs-relative glob ("adr/**", "reports/*.md") to a regex. */
export function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*+/g, (stars) => (stars.length > 1 ? '.*' : '[^/]*'));
  return new RegExp(`^${escaped}$`);
}

export function matchesInclude(relPath: string, include: string): boolean {
  if (include === '**') {
    return true;
  }
  // A bare directory prefix ("adr/") matches everything under it.
  if (include.endsWith('/')) {
    return relPath.startsWith(include);
  }
  return globToRegex(include).test(relPath);
}

function expectedFor(schema: FrontmatterFieldSchema): string {
  if (schema.type === 'enum') {
    return `one of ${(schema.values ?? []).map((v) => JSON.stringify(v)).join(' | ')}`;
  }
  if (schema.type === 'date') {
    return 'a date (YYYY-MM-DD)';
  }
  return `a ${schema.type}`;
}

function describeActual(value: unknown): string {
  if (value instanceof Date) {
    return `date ${value.toISOString().slice(0, 10)}`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  return `${typeof value} ${JSON.stringify(value)}`;
}

function valueMatches(value: unknown, schema: FrontmatterFieldSchema): boolean {
  switch (schema.type) {
    case 'string':
      return typeof value === 'string' && value.trim() !== '';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      // YAML parses unquoted dates into Date objects; quoted ones stay strings.
      return (
        (value instanceof Date && !Number.isNaN(value.getTime())) ||
        (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
      );
    case 'enum':
      return typeof value === 'string' && (schema.values ?? []).includes(value);
    default:
      return true;
  }
}

export function validateDocFrontmatter(
  frontmatter: Record<string, unknown>,
  schema: FrontmatterSchema,
): FieldViolation[] {
  const violations: FieldViolation[] = [];
  for (const [field, fieldSchema] of Object.entries(schema.fields)) {
    const value = frontmatter[field];
    if (value === undefined || value === null || value === '') {
      if (fieldSchema.required) {
        violations.push({
          field,
          expected: expectedFor(fieldSchema),
          actual: 'missing',
        });
      }
      continue;
    }
    if (!valueMatches(value, fieldSchema)) {
      violations.push({
        field,
        expected: expectedFor(fieldSchema),
        actual: describeActual(value),
      });
    }
  }
  return violations;
}

/** Fields any schema marks `index: true` — these flow to the agent surface (S2.2.2). */
export function indexedFields(schemas: FrontmatterSchema[]): string[] {
  const fields = new Set<string>();
  for (const schema of schemas) {
    for (const [name, fieldSchema] of Object.entries(schema.fields)) {
      if (fieldSchema.index) {
        fields.add(name);
      }
    }
  }
  return [...fields].sort();
}
