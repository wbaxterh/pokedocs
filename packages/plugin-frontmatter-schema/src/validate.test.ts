import { describe, expect, it } from 'vitest';
import type { FrontmatterSchema } from './index.js';
import {
  indexedFields,
  matchesInclude,
  validateDocFrontmatter,
} from './validate.js';

const ADR_SCHEMA: FrontmatterSchema = {
  include: 'adr/**',
  fields: {
    status: {
      type: 'enum',
      required: true,
      values: ['proposed', 'accepted', 'superseded'],
      index: true,
    },
    last_verified: { type: 'date', required: true },
    owner: { type: 'string', index: true },
    weight: { type: 'number' },
  },
};

describe('S2.2.1 — include matching', () => {
  it('matches globs, directory prefixes, and the catch-all', () => {
    expect(matchesInclude('adr/0001-choice.md', 'adr/**')).toBe(true);
    expect(matchesInclude('guides/setup.md', 'adr/**')).toBe(false);
    expect(matchesInclude('adr/deep/nested.md', 'adr/')).toBe(true);
    expect(matchesInclude('anything/at/all.mdx', '**')).toBe(true);
    expect(matchesInclude('reports/q1.md', 'reports/*.md')).toBe(true);
    expect(matchesInclude('reports/deep/q1.md', 'reports/*.md')).toBe(false);
  });
});

describe('S2.2.1 — field validation', () => {
  it('passes a fully valid document', () => {
    expect(
      validateDocFrontmatter(
        {
          status: 'accepted',
          last_verified: new Date('2026-07-01'),
          owner: 'platform',
          weight: 3,
        },
        ADR_SCHEMA,
      ),
    ).toHaveLength(0);
  });

  it('reports a missing required field with the expected shape', () => {
    const violations = validateDocFrontmatter(
      { last_verified: '2026-07-01' },
      ADR_SCHEMA,
    );
    expect(violations).toMatchObject([
      {
        field: 'status',
        expected: 'one of "proposed" | "accepted" | "superseded"',
        actual: 'missing',
      },
    ]);
  });

  it('reports enum, date, and type mismatches with actual values', () => {
    const violations = validateDocFrontmatter(
      {
        status: 'wip',
        last_verified: 'yesterday',
        owner: 42,
      },
      ADR_SCHEMA,
    );
    expect(violations).toMatchObject([
      { field: 'status', actual: '"wip"' },
      { field: 'last_verified', expected: 'a date (YYYY-MM-DD)' },
      { field: 'owner', expected: 'a string' },
    ]);
  });

  it('accepts YAML-parsed Date objects and quoted date strings', () => {
    const dates = { status: 'accepted' };
    expect(
      validateDocFrontmatter(
        { ...dates, last_verified: new Date('2026-01-15') },
        ADR_SCHEMA,
      ),
    ).toHaveLength(0);
    expect(
      validateDocFrontmatter(
        { ...dates, last_verified: '2026-01-15' },
        ADR_SCHEMA,
      ),
    ).toHaveLength(0);
  });

  it('treats optional fields as valid when absent, empty required strings as missing', () => {
    expect(
      validateDocFrontmatter(
        { status: 'accepted', last_verified: '2026-01-15' },
        ADR_SCHEMA,
      ),
    ).toHaveLength(0);
    expect(
      validateDocFrontmatter(
        { status: 'accepted', last_verified: '' },
        ADR_SCHEMA,
      ),
    ).toMatchObject([{ field: 'last_verified', actual: 'missing' }]);
  });
});

describe('S2.2.2 — indexed fields', () => {
  it('collects fields marked index: true across schemas, sorted and deduped', () => {
    expect(
      indexedFields([
        ADR_SCHEMA,
        {
          include: '**',
          fields: { owner: { type: 'string', index: true } },
        },
      ]),
    ).toEqual(['owner', 'status']);
    expect(indexedFields([])).toEqual([]);
  });
});
